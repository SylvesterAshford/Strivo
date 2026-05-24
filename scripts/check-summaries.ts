import { getEntities } from "@/lib/zep";
import { db } from "@/db/client";

async function main() {
  const ws = await db.query.workspaces.findFirst();
  if (!ws) process.exit(1);
  const entities = await getEntities(ws.id);
  const names = ["Saudi Aramco", "Saudi Arabia's Vision 2030", "Alibaba Qwen-plus model", "Houthi attacks", "OPEC+"];
  for (const n of names) {
    const e = entities.find(x => x.name === n);
    if (e) console.log(`[${e.kind}] ${e.name}\n  → ${e.summary}\n`);
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
