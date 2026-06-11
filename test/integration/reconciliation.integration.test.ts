// THE trust-gap test: Home's verdict and Reports' receipts must agree.
//
// Seeds facts across the MMT month boundary for the dev workspace, invokes the
// real /home and /reports GET handlers against PGlite, and asserts:
//   1. home.advisor.snapshot.profitMmk === reports.month.netMmk
//   2. home.advisor.periodMonth   === reports.month.periodMonth
//   3. a second workspace's facts never leak into the dev workspace's totals
//
// The route handlers reach @/db/client, which we replace with the PGlite-backed
// harness handle. Auth-bypass (vitest env) resolves to dev_local_user, which we
// pre-seed a workspace for so getOrCreateMobileWorkspace reuses it.

import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";

// Replace the real DB singleton with the PGlite harness BEFORE the routes import it.
vi.mock("@/db/client", async () => {
  const harness = await import("./harness");
  return { db: harness.testDb };
});

// Real auth is enforced (no bypass). Stub only the external Supabase token check
// so the request's Bearer token resolves to the dev workspace's owner.
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "dev_local_user" } }, error: null }),
    },
  }),
}));

import * as harness from "./harness";
import { GET as homeGET } from "@/app/api/mobile/v1/home/route";
import { GET as reportsGET } from "@/app/api/mobile/v1/reports/route";

const DEV_USER_ID = "dev_local_user"; // matches the auth-bypass DEV_USER in @/lib/auth/mobile
const DEV_WS = "ws_test_dev";
const OTHER_USER_ID = "other_user";
const OTHER_WS = "ws_test_other";

async function callJson(handler: (req: Request) => Promise<unknown>, path: string) {
  const res = (await handler(
    new Request(`http://localhost${path}`, { headers: { authorization: "Bearer test-token" } }),
  )) as Response;
  return res.json();
}

beforeAll(async () => {
  await harness.loadSchema();
  await harness.seedWorkspace(DEV_USER_ID, DEV_WS);
  await harness.seedWorkspace(OTHER_USER_ID, OTHER_WS);

  // Dev workspace — reviewed month resolves to JUNE 2026 (latest fact is June).
  // June sales: 100_000 (Jun 10) + 7_000 (boundary, 2026-05-31T18:00Z = Jun 1
  // 00:30 MMT → June). June expenses: 40_000. June profit = 67_000.
  await harness.seedFact(DEV_WS, { kind: "sale", amountMmk: 100_000, occurredAt: "2026-06-10T05:00:00Z" });
  await harness.seedFact(DEV_WS, { kind: "expense", amountMmk: 40_000, occurredAt: "2026-06-12T05:00:00Z", category: "rent" });
  await harness.seedFact(DEV_WS, { kind: "sale", amountMmk: 7_000, occurredAt: "2026-05-31T18:00:00Z" }); // → June MMT
  // Boundary control: 2026-05-31T17:00Z = May 31 23:30 MMT → MAY, must NOT count in June.
  await harness.seedFact(DEV_WS, { kind: "sale", amountMmk: 3_000, occurredAt: "2026-05-31T17:00:00Z" });
  // Prior-month data so the advisor has a comparison.
  await harness.seedFact(DEV_WS, { kind: "sale", amountMmk: 50_000, occurredAt: "2026-05-15T05:00:00Z" });

  // Other workspace — should never appear in the dev workspace's numbers.
  await harness.seedFact(OTHER_WS, { kind: "sale", amountMmk: 999_999, occurredAt: "2026-06-11T05:00:00Z" });
});

afterAll(async () => {
  await harness.pg.close();
});

describe("Home ↔ Reports reconciliation (PGlite integration)", () => {
  it("Home profit and Reports net agree for the same reviewed month", async () => {
    const home = (await callJson(homeGET, "/api/mobile/v1/home")) as {
      advisor: { periodMonth: string; snapshot: { profitMmk: number; salesMmk: number; expensesMmk: number } } | null;
    };
    const reports = (await callJson(reportsGET, "/api/mobile/v1/reports")) as {
      month: { periodMonth: string; salesMmk: number; expensesMmk: number; netMmk: number };
    };

    expect(home.advisor).not.toBeNull();
    // Reviewed month is June 2026 on both screens.
    expect(home.advisor!.periodMonth).toBe("2026-06");
    expect(reports.month.periodMonth).toBe("2026-06");

    // The boundary sale (Jun 1 00:30 MMT) counts; the May 23:30 MMT one does not.
    expect(home.advisor!.snapshot.salesMmk).toBe(107_000);
    expect(home.advisor!.snapshot.profitMmk).toBe(67_000);

    // THE reconciliation guarantee.
    expect(reports.month.netMmk).toBe(home.advisor!.snapshot.profitMmk);
    expect(reports.month.salesMmk).toBe(home.advisor!.snapshot.salesMmk);
    expect(home.advisor!.periodMonth).toBe(reports.month.periodMonth);
  });

  it("does not leak another workspace's facts into the dev workspace totals", async () => {
    const home = (await callJson(homeGET, "/api/mobile/v1/home")) as {
      advisor: { snapshot: { salesMmk: number } } | null;
    };
    // 999_999 belongs to OTHER_WS; dev June sales stay 107_000.
    expect(home.advisor!.snapshot.salesMmk).toBe(107_000);
  });
});
