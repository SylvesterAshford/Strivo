import { ZepClient } from "@getzep/zep-cloud";
import { env } from "@/lib/env";
import { log } from "@/lib/log";

const zep = new ZepClient({ apiKey: env.ZEP_API_KEY });

// Graph ID convention: workspace_id is used as the Zep graph_id.
// Branch contexts (phase 4) use `${workspaceId}__branch_${branchId}`.

export async function ensureGroup(graphId: string, description: string) {
  try {
    await zep.graph.create({ graphId, description });
  } catch (err: unknown) {
    // If graph already exists, that's fine.
    const msg = err instanceof Error ? err.message : String(err);
    if (!/already exists|conflict|409/i.test(msg)) {
      throw err;
    }
  }
}

export const ZEP_MAX_CHARS = 9_800;

function truncateToWordBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > maxChars * 0.8 ? truncated.slice(0, lastSpace) : truncated;
}

export async function ingestText(params: {
  groupId: string;
  text: string;
  source: string;
}): Promise<{ messageId: string }> {
  const data = truncateToWordBoundary(params.text, ZEP_MAX_CHARS);
  const episode = await zep.graph.add({
    data,
    type: "text",
    graphId: params.groupId,
    sourceDescription: params.source,
  });
  log({ level: "debug", message: "zep.ingestText result", meta: { uuid: episode.uuid } });
  return { messageId: episode.uuid };
}

export async function getEntities(groupId: string) {
  const nodes = await zep.graph.node.getByGraphId(groupId, {});
  return nodes.map((n) => ({
    id: n.uuid,
    name: n.name,
    summary: n.summary ?? null,
    kind: inferKind(n.labels ?? [], n.name ?? "", n.summary ?? ""),
    createdAt: n.createdAt,
  }));
}

export async function getEdges(groupId: string) {
  const edgeList = await zep.graph.edge.getByGraphId(groupId, {});
  return edgeList.map((e) => ({
    id: e.uuid,
    fromId: e.sourceNodeUuid,
    toId: e.targetNodeUuid,
    name: e.name,
    fact: e.fact,
    validFrom: e.validAt ?? e.createdAt,
    validUntil: e.invalidAt ?? null,
  }));
}

function inferKind(labels: string[], name: string, summary: string): string {
  // Try Zep labels first (in case a future version populates them)
  const lower = labels.map((l) => l.toLowerCase());
  if (lower.some((l) => l.includes("person") || l.includes("human"))) return "person";
  if (lower.some((l) => l.includes("company") || l.includes("corp"))) return "company";
  if (lower.some((l) => l.includes("organization") || l.includes("agency"))) return "organization";
  if (lower.some((l) => l.includes("product") || l.includes("service"))) return "product";
  if (lower.some((l) => l.includes("event"))) return "event";
  if (lower.some((l) => l.includes("policy") || l.includes("regulation"))) return "policy";
  if (lower.some((l) => l.includes("location") || l.includes("place"))) return "place";

  // --- Name-first heuristics (before summary, to avoid false matches) ---
  const nameLow = name.toLowerCase();

  // Known country/place names — check FIRST to avoid false person matches
  if (/^(iran|iraq|kuwait|oman|bahrain|qatar|uae|yemen|israel|russia|china|usa|india|turkey|egypt|libya|nigeria|angola|venezuela|norway|canada|mexico|brazil|algeria|saudi arabia|united states|united kingdom|united arab emirates|abu dhabi|north field|strait of hormuz|red sea|persian gulf|arabian peninsula|cape of good hope|rumaila|halfaya|tabuk|dhahran|ruwais|jazan|neom|west qurna|al-zour|west qurna-2)$/i.test(nameLow)) return "place";
  // Place suffix patterns in the name itself (before Arabic name particle check)
  if (/\b(field|sea|gulf|strait|bay|river|basin|peninsula|continent|valley|plateau|desert|mountain|port|island|zone|province|region|territory|waterway|refinery|complex|oilfield)\b/i.test(name)) return "place";

  // Organization: name contains government/org words
  if (/\b(government|parliament|congress|senate|administration|ministry|department|bureau|authority|agency|commission|committee|council|institute|alliance|coalition|union|fund|bloc|consortium)\b/i.test(name)) return "organization";

  // Company: name itself contains company/energy words
  if (/\b(energy|oil|petroleum|gas|chemical|petrochemical|mining|power|electric|refin)\b/i.test(name) && !/^(iran|iraq|kuwait|saudi|qatar|uae|oman|bahrain|yemen)\b/i.test(name)) return "company";
  if (/\b(company|corporation|corp|enterprise|holdings|group|conglomerate|industries)\b/i.test(name)) return "company";

  // Arabic person name particles (al- only when NOT at the start of a place name)
  if (/\b(bin|ibn|bint)\b/i.test(name)) return "person";
  if (/ al-/i.test(name)) return "person"; // "Al-" mid-name = person (Saad Al-Kaabi); start of name = place already handled

  // Name looks like "Firstname Lastname" with no org/place words — check AFTER org + place
  if (/^[A-Z][a-z]+ [A-Z]/.test(name) && !/\b(oil|energy|petroleum|company|corp|fund|group|bank|alliance|organization|administration|ministry|agency|committee|council|corporation|commission|authority|enterprise|holding|international|national|institute|association|union|coalition|accord|agreement|treaty|emirate|kingdom|republic|state|aramco|adnoc|opec|nioc|somo|kpc|accords|vision|program|initiative|university|simulation|report|level|configuration|deployment|model|attacks|offensive|platform|system|war|conflict)\b/i.test(name)) return "person";

  // --- Summary-based heuristics ---
  const summaryLow = summary.toLowerCase();

  // Company: check first — avoids "fund" / "organization" false-positives when summary describes an IOC
  if (/\b(company|corporation|firm|enterprise|conglomerate|subsidiary|petrochemical)\b/.test(summaryLow)) return "company";
  if (/\b(oil company|energy company|national oil|state oil|petroleum company|state-owned company)\b/.test(summaryLow)) return "company";

  // Person: role title directly follows "is [a/an/the]" — excludes "is championed by Crown Prince" patterns
  if (/\bis\s+(?:a |an |the )?(ceo|president|prime minister|minister|director|chairman|founder|king|prince|crown prince|secretary)\b/i.test(summary)) return "person";
  if (/\b(mr\.|dr\.|sheikh|sir|lord)\b/i.test(summary)) return "person";

  // Organization: alliance, fund, political body
  if (/\b(organization|alliance|coalition|union|association|committee|council|agency|bloc|consortium|ministry|administration|authority|commission|institute)\b/.test(summaryLow)) return "organization";
  // "sovereign wealth fund" / "investment fund" → org; naked "fund" in passing → skip
  if (/\b(sovereign wealth fund|investment fund|state fund|wealth fund)\b/.test(summaryLow)) return "organization";

  // Place: described as a location concept
  if (/\b(country|nation|kingdom|republic|emirate|province|city|region|district|territory|strait|ocean|gulf|bay|oilfield|basin|waterway|peninsula|continent)\b/.test(summaryLow)) return "place";
  // CamelCase portmanteau (ExxonMobil, PetroChina) or all-caps acronym (not known org acronyms)
  if (/^[A-Z]{2,}$/.test(name) && !/(OPEC|NATO|UN|IMF|EU|UAE|NIOC|SOMO|KPC|PIF|LNG|IOC|CEO|GDP|IPO|MBS)/.test(name)) return "company";
  if (/[a-z][A-Z]/.test(name) && !/\s/.test(name)) return "company";
  // Operating verbs imply a company
  if (/\b(operates|produces|refines|extracts|drills|explores|distributes|markets|exports|imports)\b/.test(summaryLow)) return "company";

  // Policy / agreement
  if (/\b(policy|agreement|treaty|accord|deal|act|regulation|law|sanction|embargo|initiative|accord)\b/.test(summaryLow)) return "policy";

  // Product / project
  if (/\b(product|service|platform|software|application|tool|system|technology|project|program|mission)\b/.test(summaryLow)) return "product";

  return "default";
}

export async function deleteEpisodeIfPossible(params: { groupId: string; materialId: string }) {
  log({
    level: "warn",
    message: "zep.delete_episode.no_op",
    meta: {
      ...params,
      reason: "Zep SDK does not currently support episode-level deletion. Local cleanup only.",
    },
  });
}

export async function refreshGroupGraph(groupId: string) {
  const zepEntities = await getEntities(groupId);
  const zepEdges = await getEdges(groupId);

  log({
    level: "info",
    message: "zep.refresh_complete",
    meta: { groupId, zepEntityCount: zepEntities.length, zepEdgeCount: zepEdges.length },
  });
}

export async function waitForExtraction(params: {
  groupId: string;
  messageId: string;
  timeoutMs?: number;
}): Promise<boolean> {
  const timeout = params.timeoutMs ?? 45_000;
  const deadline = Date.now() + timeout;
  const pollInterval = 3_000;

  // Wait for entity count to stabilize — Zep processes asynchronously
  let prevCount = -1;
  let stableRounds = 0;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollInterval));
    const nodes = await zep.graph.node.getByGraphId(params.groupId, {});
    const count = nodes.length;
    if (count > 0 && count === prevCount) {
      stableRounds++;
      if (stableRounds >= 2) break; // stable for 6s → done
    } else {
      stableRounds = 0;
    }
    prevCount = count;
  }
  return true;
}
