// PR1 integration tests (PGlite):
//   1. Reconciliation — /insights and /home show the SAME profit for a business.
//   2. occurred_at_source — manual entry (facts/confirm) tags 'estimated'; the
//      column accepts 'explicit'. This is the eureka made testable: date
//      reliability is a property of the ingestion path.

import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";

vi.mock("@/db/client", async () => {
  const harness = await import("./harness");
  return { db: harness.testDb };
});

// Real auth is enforced (no bypass). Stub only the external Supabase token check.
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "dev_local_user" } }, error: null }),
    },
  }),
}));

import * as harness from "./harness";
import { GET as insightsGET } from "@/app/api/mobile/v1/insights/route";
import { GET as homeGET } from "@/app/api/mobile/v1/home/route";
import { POST as factsConfirmPOST } from "@/app/api/mobile/v1/facts/confirm/route";
import { facts } from "@/db/schema";
import { eq } from "drizzle-orm";

const DEV_USER_ID = "dev_local_user"; // matches auth-bypass DEV_USER
const DEV_WS = "ws_test_dev";

beforeAll(async () => {
  await harness.loadSchema();
  await harness.seedWorkspace(DEV_USER_ID, DEV_WS);
  // June 2026 reviewed month: sales 100k + expense 40k → profit 60k.
  await harness.seedFact(DEV_WS, { kind: "sale", amountMmk: 100_000, occurredAt: "2026-06-10T05:00:00Z" });
  await harness.seedFact(DEV_WS, { kind: "expense", amountMmk: 40_000, occurredAt: "2026-06-12T05:00:00Z" });
  await harness.seedFact(DEV_WS, { kind: "receivable", amountMmk: 8_000, occurredAt: "2026-06-01T05:00:00Z" });
});

afterAll(async () => {
  await harness.pg.close();
});

async function json(handler: (req: Request) => Promise<unknown>, path: string) {
  const res = (await handler(
    new Request(`http://localhost${path}`, { headers: { authorization: "Bearer test-token" } }),
  )) as Response;
  return res.json();
}

describe("Analytics ↔ Home reconciliation (PGlite)", () => {
  it("insights profit == home profit for the same business", async () => {
    const insights = (await json(insightsGET, "/api/mobile/v1/insights")) as {
      ready: boolean;
      analytics: { advisor: { periodMonth: string; snapshot: { profitMmk: number } } | null; receivables: unknown[] };
    };
    const home = (await json(homeGET, "/api/mobile/v1/home")) as {
      advisor: { periodMonth: string; snapshot: { profitMmk: number } } | null;
    };

    expect(insights.ready).toBe(true);
    expect(insights.analytics.advisor).not.toBeNull();
    expect(home.advisor).not.toBeNull();
    expect(insights.analytics.advisor!.snapshot.profitMmk).toBe(60_000);
    expect(insights.analytics.advisor!.snapshot.profitMmk).toBe(home.advisor!.snapshot.profitMmk);
    expect(insights.analytics.advisor!.periodMonth).toBe(home.advisor!.periodMonth);
    // who-owes-you present.
    expect(insights.analytics.receivables.length).toBe(1);
  });
});

describe("occurred_at_source (date reliability by ingestion path)", () => {
  it("manual entry (facts/confirm) tags occurred_at_source = 'estimated'", async () => {
    const req = new Request("http://localhost/api/mobile/v1/facts/confirm", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer test-token" },
      body: JSON.stringify({ facts: [{ kind: "sale", amountMmk: 5_000, description: "manual sale" }] }),
    });
    const res = (await factsConfirmPOST(req)) as Response;
    expect(res.status).toBeLessThan(300);

    const [row] = await harness.testDb
      .select({ src: facts.occurredAtSource })
      .from(facts)
      .where(eq(facts.description, "manual sale"));
    expect(row.src).toBe("estimated");
  });

  it("the column accepts 'explicit' (the file-import path's value)", async () => {
    await harness.testDb.insert(facts).values({
      id: "fact_explicit_test",
      workspaceId: DEV_WS,
      kind: "sale",
      amountMmk: 1_000,
      description: "explicit row",
      occurredAt: new Date("2026-06-05T00:00:00Z"),
      occurredAtSource: "explicit",
    });
    const [row] = await harness.testDb
      .select({ src: facts.occurredAtSource })
      .from(facts)
      .where(eq(facts.id, "fact_explicit_test"));
    expect(row.src).toBe("explicit");
  });
});
