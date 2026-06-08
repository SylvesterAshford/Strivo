# TODOS

## Testing

- [ ] **Integration / E2E tests for critical flows**
  - **What:** Browser-level tests for the multi-step flows the unit suite can't cover: Google login → workspace sync → onboarding → home; and Excel/text import → preview → confirm → data appears.
  - **Why:** The focused unit suite (`resolveStyle`, `formatCurrency`, `decideRedirect`) covers pure logic, but the highest-value journeys (auth and money-import) are only manually verified. The auth redirect chain and the import preview→confirm round-trip are exactly where integration bugs hide.
  - **Needs:** A seeded test account + a Supabase test project (or auth-bypass + a seeded DB) and a running stack. Not wired for CI yet.
  - **Start:** Run `gstack /qa` against a deployed preview, or add Playwright with `scripts/seed-test-accounts.ts` for fixtures.
  - **Depends on:** deploy/CI pipeline for a preview URL.
