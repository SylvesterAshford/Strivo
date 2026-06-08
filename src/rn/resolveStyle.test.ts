import { describe, it, expect } from "vitest";
import { resolveStyle } from "@/rn";

// Guards the RN→CSS style conversion that every component renders through.
// The lineHeight case is a regression test: React treats a numeric lineHeight
// as a unitless multiplier, so emitting the token px values raw blew every line
// box up to lineHeight×font-size and ballooned the whole UI.
describe("resolveStyle", () => {
  describe("lineHeight (regression: px vs unitless multiplier)", () => {
    it("emits token px values as px strings", () => {
      expect(resolveStyle({ lineHeight: 18.2 }).lineHeight).toBe("18.2px");
      expect(resolveStyle({ lineHeight: 28 }).lineHeight).toBe("28px");
      expect(resolveStyle({ lineHeight: 46 }).lineHeight).toBe("46px");
    });
    it("keeps small numbers (<= 3) as unitless CSS multipliers", () => {
      expect(resolveStyle({ lineHeight: 1 }).lineHeight).toBe(1);
      expect(resolveStyle({ lineHeight: 1.1 }).lineHeight).toBe(1.1);
    });
  });

  describe("RN-only spacing shorthands", () => {
    it("expands paddingVertical / paddingHorizontal", () => {
      const css = resolveStyle({ paddingVertical: 8, paddingHorizontal: 22 });
      expect(css.paddingTop).toBe(8);
      expect(css.paddingBottom).toBe(8);
      expect(css.paddingLeft).toBe(22);
      expect(css.paddingRight).toBe(22);
      expect("paddingVertical" in css).toBe(false);
      expect("paddingHorizontal" in css).toBe(false);
    });
    it("expands marginVertical / marginHorizontal", () => {
      const css = resolveStyle({ marginVertical: 4, marginHorizontal: 6 });
      expect(css.marginTop).toBe(4);
      expect(css.marginBottom).toBe(4);
      expect(css.marginLeft).toBe(6);
      expect(css.marginRight).toBe(6);
    });
  });

  describe("transform arrays → CSS string", () => {
    it("converts scale", () => {
      expect(resolveStyle({ transform: [{ scale: 0.98 }] }).transform).toBe("scale(0.98)");
    });
    it("converts and orders multiple ops with px on translate", () => {
      expect(resolveStyle({ transform: [{ translateX: 4 }, { scale: 1 }] }).transform).toBe("translateX(4px) scale(1)");
    });
  });

  describe("fontFamily mapping", () => {
    it("maps a token family to its CSS variable stack", () => {
      expect(resolveStyle({ fontFamily: "Inter" }).fontFamily).toContain("var(--font-inter)");
    });
    it("derives weight 500 from -Medium families", () => {
      expect(resolveStyle({ fontFamily: "Inter-Medium" }).fontWeight).toBe(500);
    });
    it("derives italic from -Italic families", () => {
      expect(resolveStyle({ fontFamily: "InstrumentSerif-Italic" }).fontStyle).toBe("italic");
    });
  });

  describe("arrays + falsy", () => {
    it("flattens an array, later entries win", () => {
      const css = resolveStyle([{ color: "red", padding: 1 }, false, { color: "blue" }]);
      expect(css.color).toBe("blue");
      expect(css.padding).toBe(1);
    });
    it("returns {} for null/undefined/false", () => {
      expect(resolveStyle(null)).toEqual({});
      expect(resolveStyle(undefined)).toEqual({});
      expect(resolveStyle(false)).toEqual({});
    });
  });
});
