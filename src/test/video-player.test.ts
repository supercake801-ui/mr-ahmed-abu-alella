import { describe, expect, it } from "vitest";
import { doubleTapTarget, SPEEDS } from "@/components/video-player";
import { autoQuality, cuesToVtt } from '@/lib/video-media';

describe("video player rules", () => {
  it('Auto chooses a real 720p source for a 1280px player', () => expect(autoQuality([{label:'480p',height:480,url:'low'},{label:'720p',height:720,url:'mid'},{label:'1080p',height:1080,url:'high'}],1280)?.url).toBe('mid'));
  it('preserves source-window caption timestamps in WebVTT', () => expect(cuesToVtt([{start:8,end:16,text:'التاريخ'}])).toContain('00:00:08.000 --> 00:00:16.000\nالتاريخ'));
  it("allows speeds up to 3x", () => expect(Math.max(...SPEEDS)).toBe(3));
  it("double-tap right skips forward 10 seconds", () => expect(doubleTapTarget(20, 100, "right")).toBe(30));
  it("double-tap left goes back 10 seconds", () => expect(doubleTapTarget(20, 100, "left")).toBe(10));
  it("never seeks before the start", () => expect(doubleTapTarget(4, 100, "left")).toBe(0));
});