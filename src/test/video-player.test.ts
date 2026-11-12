import { describe, expect, it } from "vitest";
import { doubleTapTarget, SPEEDS } from "@/components/video-player";

describe("video player rules", () => {
  it("allows speeds up to 3x", () => expect(Math.max(...SPEEDS)).toBe(3));
  it("double-tap right skips forward 10 seconds", () => expect(doubleTapTarget(20, 100, "right")).toBe(30));
  it("double-tap left goes back 10 seconds", () => expect(doubleTapTarget(20, 100, "left")).toBe(10));
  it("never seeks before the start", () => expect(doubleTapTarget(4, 100, "left")).toBe(0));
});