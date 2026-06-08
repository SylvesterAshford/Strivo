import { describe, it, expect } from "vitest";
import { decideRedirect, type GateState } from "./auth-gate-logic";

const base: GateState = {
  bypass: false,
  configured: true,
  hasSession: false,
  onboarded: false,
  pathname: "/",
};

describe("decideRedirect", () => {
  describe("bypass mode", () => {
    it("pushes login/onboarding back to the app", () => {
      expect(decideRedirect({ ...base, bypass: true, pathname: "/login" })).toBe("/");
      expect(decideRedirect({ ...base, bypass: true, pathname: "/onboarding" })).toBe("/");
      expect(decideRedirect({ ...base, bypass: true, pathname: "/onboarding/periods" })).toBe("/");
    });
    it("stays put on app routes", () => {
      expect(decideRedirect({ ...base, bypass: true, pathname: "/" })).toBeNull();
      expect(decideRedirect({ ...base, bypass: true, pathname: "/reports" })).toBeNull();
    });
  });

  describe("configured, no session", () => {
    it("redirects to /login from a protected route", () => {
      expect(decideRedirect({ ...base, pathname: "/" })).toBe("/login");
      expect(decideRedirect({ ...base, pathname: "/reports" })).toBe("/login");
    });
    it("stays on /login", () => {
      expect(decideRedirect({ ...base, pathname: "/login" })).toBeNull();
    });
  });

  describe("authed but not onboarded", () => {
    it("redirects to /onboarding", () => {
      expect(decideRedirect({ ...base, hasSession: true, pathname: "/" })).toBe("/onboarding");
    });
    it("stays within the onboarding wizard", () => {
      expect(decideRedirect({ ...base, hasSession: true, pathname: "/onboarding/products" })).toBeNull();
    });
  });

  describe("authed and onboarded", () => {
    it("keeps the user out of login/onboarding", () => {
      const s = { ...base, hasSession: true, onboarded: true };
      expect(decideRedirect({ ...s, pathname: "/login" })).toBe("/");
      expect(decideRedirect({ ...s, pathname: "/onboarding" })).toBe("/");
    });
    it("stays on app routes", () => {
      const s = { ...base, hasSession: true, onboarded: true };
      expect(decideRedirect({ ...s, pathname: "/" })).toBeNull();
      expect(decideRedirect({ ...s, pathname: "/profile" })).toBeNull();
    });
  });

  describe("not configured (dev, no Supabase) treats everyone as authed", () => {
    it("routes to onboarding when not onboarded", () => {
      expect(decideRedirect({ ...base, configured: false, pathname: "/" })).toBe("/onboarding");
    });
    it("stays on app routes once onboarded", () => {
      expect(decideRedirect({ ...base, configured: false, onboarded: true, pathname: "/" })).toBeNull();
    });
  });
});
