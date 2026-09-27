import { describe, expect, it } from "vitest";
import { actionClassName } from "../../src/components/ui/action-link";

describe("shared action styling", () => {
  it("keeps a visible foreground and keyboard focus treatment for primary links", () => {
    const classes = actionClassName({ variant: "primary" });
    expect(classes).toContain("bg-primary");
    expect(classes).toContain("text-primary-text");
    expect(classes).toContain("focus-visible:ring-2");
    expect(classes).toContain("active:translate-y-px");
  });

  it("defines the requested secondary, outline, danger, disabled and loading-compatible states", () => {
    expect(actionClassName({ variant: "secondary" })).toContain("bg-surface-muted");
    expect(actionClassName({ variant: "outline" })).toContain("border-border");
    expect(actionClassName({ variant: "danger" })).toContain("text-primary-text");
    expect(actionClassName()).toContain("disabled:opacity-50");
  });
});
