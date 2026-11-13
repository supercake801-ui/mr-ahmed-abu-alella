export type QualitySource = { label: string; url: string; height?: number };
export type CaptionCue = { start: number; end: number; text: string };
export function vttTime(seconds: number) {
  return new Date(Math.round(seconds * 1000)).toISOString().slice(11, 23);
}
export function cuesToVtt(cues: CaptionCue[]) {
  return 'WEBVTT\n\n' + cues.map((c) => `${vttTime(c.start)} --> ${vttTime(c.end)}\n${c.text.replace(/-->/g, '→')}\n`).join('\n');
}
export function autoQuality(sources: QualitySource[], width: number, saveData = false) {
  const sorted = sources.filter((s) => s.height).sort((a, b) => (a.height ?? 0) - (b.height ?? 0));
  return (saveData ? sorted[0] : sorted.find((s) => (s.height ?? 0) >= width * 9 / 16) ?? sorted.at(-1)) ?? sources[0];
}