# TODOS

## Testing

- [ ] **Integration / E2E tests for critical flows**
  - **What:** Browser-level tests for the multi-step flows the unit suite can't cover: Google login → workspace sync → onboarding → home; and Excel/text import → preview → confirm → data appears.
  - **Why:** The focused unit suite (`resolveStyle`, `formatCurrency`, `decideRedirect`) covers pure logic, but the highest-value journeys (auth and money-import) are only manually verified. The auth redirect chain and the import preview→confirm round-trip are exactly where integration bugs hide.
  - **Needs:** A seeded test account + a Supabase test project (or auth-bypass + a seeded DB) and a running stack. Not wired for CI yet.
  - **Start:** Run `gstack /qa` against a deployed preview, or add Playwright with `scripts/seed-test-accounts.ts` for fixtures.
  - **Depends on:** deploy/CI pipeline for a preview URL.

- [ ] **Extend the PGlite integration harness to other routes**
  - **What:** Reuse the PGlite in-process harness (built for the Home/Reports trust-gap fix) to add reconciliation/regression coverage to `insights`, `facts`, and the sales/expenses import routes.
  - **Why:** The expensive part — pglite + schema/RLS DDL replay + auth-bypass route invocation + `vi.mock("@/db/client")` — is built once in the trust-gap milestone. Other routes then get integration coverage cheaply instead of staying manual-only.
  - **Start:** Factor the harness setup (pglite instance + DDL + seed) into a shared `test/integration/harness.ts`; write per-route `*.integration.test.ts` against it.
  - **Depends on:** the trust-gap fix landing (creates the harness).

## Analytics

- [ ] **Fold `/analytics` into `/insights` + enforce score placement**
  - **What:** Remove the redundant `GET /analytics` route (now covered by `/insights`) and ensure growth/market scores (0–100) render on Analytics only, never on the same screen as Home's health word.
  - **Why:** `strivo-screen-logic.md` flags `/analytics` as redundant and names the "three scores on one screen" risk. Consolidating removes a dead route and locks the score-placement rule.
  - **Start:** Grep callers of `/api/mobile/v1/analytics`; migrate to `/insights`; delete the route. Audit Analytics screen for any health-score leakage.
  - **Depends on:** nothing; independent of the trust-gap fix.
