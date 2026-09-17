import { describe, expect, it } from "vitest";
import { assessLayering, suitabilityCategory } from "../../src/modules/discovery/rules";

const citrus = { familyId: "family-citrus", intensityId: "light", longevity: "moderate", noteIds: ["bergamot"] };

describe("deterministic discovery rules", () => {
  it("maps only approved controlled suitability categories", () => {
    expect(suitabilityCategory).toEqual({ mood: "MOOD", occasion: "OCCASION", weather: "WEATHER" });
  });
  it("recommends only matching family, intensity, longevity and an approved shared note", () => {
    expect(assessLayering(citrus, { ...citrus, noteIds: ["bergamot", "cedar"] })).toBe("COMPATIBLE");
    expect(assessLayering(citrus, { ...citrus, familyId: "family-woody" })).toBe("NOT_RECOMMENDED");
    expect(assessLayering(citrus, { ...citrus, noteIds: ["cedar"] })).toBe("NOT_RECOMMENDED");
    expect(assessLayering(citrus, { ...citrus, longevity: null })).toBe("INSUFFICIENT_DATA");
    expect(assessLayering(citrus, { ...citrus, intensityId: null })).toBe("INSUFFICIENT_DATA");
    expect(assessLayering(citrus, { ...citrus, noteIds: [] })).toBe("INSUFFICIENT_DATA");
  });
});
