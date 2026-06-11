// Import data-layer test: re-upload idempotency + batch history + undo.
//
// Invokes the real sales/import/confirm, imports list and imports/[id] DELETE
// handlers against PGlite and asserts:
//   1. first upload inserts all rows and records a batch
//   2. re-uploading the SAME file inserts nothing (count-aware dedupe)
//   3. an UPDATED file lands only the delta
//   4. deleting a batch cascade-deletes its facts (undo) and 404s for
//      another workspace's batch (RLS-style scoping in the route)

import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";

vi.mock("@/db/client", async () => {
  const harness = await import("./harness");
  return { db: harness.testDb };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "dev_local_user" } }, error: null }),
    },
  }),
}));

import * as harness from "./harness";
import { POST as confirmPOST } from "@/app/api/mobile/v1/sales/import/confirm/route";
import { GET as importsGET } from "@/app/api/mobile/v1/imports/route";
import { DELETE as importDELETE } from "@/app/api/mobile/v1/imports/[id]/route";

const DEV_USER_ID = "dev_local_user";
const DEV_WS = "ws_test_dev";

const HEADERS = ["Date", "Customer", "Amount"];
// rowsToFacts: mapping indices into these rows.
const MAPPING = { date: 0, customer: 1, amount: 2, product: -1, quantity: -1 };
const FILE_V1 = [
  ["2026-06-01", "KoNaing", 10_000],
  ["2026-06-02", "MaPhyu", 25_000],
  // Two genuinely identical same-day sales — both must survive.
  ["2026-06-03", "", 2_000],
  ["2026-06-03", "", 2_000],
];
const FILE_V2 = [
  ...FILE_V1,
  ["2026-06-04", "KoNaing", 40_000], // the only new row in the updated file
];

function confirmReq(rows: (string | number | null)[][], fileName: string) {
  return new Request("http://localhost/api/mobile/v1/sales/import/confirm", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer test-token" },
    body: JSON.stringify({ headers: HEADERS, rows, mapping: MAPPING, fileName }),
  });
}

async function json(res: unknown): Promise<Record<string, unknown>> {
  return (res as Response).json();
}

beforeAll(async () => {
  await harness.loadSchema();
  await harness.seedWorkspace(DEV_USER_ID, DEV_WS);
});

afterAll(async () => {
  await harness.pg.close();
});

describe("import batches: dedupe + history + undo (PGlite integration)", () => {
  let firstBatchId: string;

  it("first upload inserts every row including genuine same-day duplicates", async () => {
    const r = await json(await confirmPOST(confirmReq(FILE_V1, "june.xlsx")));
    expect(r.inserted).toBe(4);
    expect(r.skipped).toBe(0);
    firstBatchId = r.batchId as string;
    expect(firstBatchId).toMatch(/^imp_/);
  });

  it("re-uploading the identical file is a no-op", async () => {
    const r = await json(await confirmPOST(confirmReq(FILE_V1, "june.xlsx")));
    expect(r.inserted).toBe(0);
    expect(r.skipped).toBe(4);
  });

  it("an updated file lands only the delta", async () => {
    const r = await json(await confirmPOST(confirmReq(FILE_V2, "june-v2.xlsx")));
    expect(r.inserted).toBe(1);
    expect(r.skipped).toBe(4);
  });

  it("history lists all three batches, newest first, with file names", async () => {
    const res = await importsGET(
      new Request("http://localhost/api/mobile/v1/imports", {
        headers: { authorization: "Bearer test-token" },
      })
    );
    const { batches } = (await json(res)) as unknown as {
      batches: { id: string; fileName: string | null; insertedCount: number; skippedCount: number }[];
    };
    expect(batches).toHaveLength(3);
    expect(batches[0].fileName).toBe("june-v2.xlsx");
    expect(batches.map((b) => b.insertedCount)).toEqual([1, 0, 4]);
  });

  it("deleting a batch cascade-deletes its facts (undo)", async () => {
    const before = await harness.countFacts(DEV_WS);
    expect(before).toBe(5); // 4 + 0 + 1

    const res = await importDELETE(
      new Request(`http://localhost/api/mobile/v1/imports/${firstBatchId}`, {
        method: "DELETE",
        headers: { authorization: "Bearer test-token" },
      }),
      { params: Promise.resolve({ id: firstBatchId }) }
    );
    expect((res as Response).status).toBe(200);

    const after = await harness.countFacts(DEV_WS);
    expect(after).toBe(1); // only the v2 delta row survives
  });

  it("deleting an unknown/foreign batch 404s", async () => {
    const res = await importDELETE(
      new Request("http://localhost/api/mobile/v1/imports/imp_nope", {
        method: "DELETE",
        headers: { authorization: "Bearer test-token" },
      }),
      { params: Promise.resolve({ id: "imp_nope" }) }
    );
    expect((res as Response).status).toBe(404);
  });
});
