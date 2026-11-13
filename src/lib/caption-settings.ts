export const CAPTION_SIZES = ['small', 'medium', 'large', 'extra-large'] as const;
export type CaptionSize = typeof CAPTION_SIZES[number];
export type CaptionLanguage = 'auto' | 'ar' | 'en';
export function captionSizeOrDefault(value: string | null): CaptionSize {
  return CAPTION_SIZES.find(size => size === value) ?? 'medium';
}
export function transcriptionPrompt(title: string, previous: string) {
  return `Educational history lesson: ${title.slice(0, 200)}. Arabic (including Egyptian Arabic) and English may both be spoken. Transcribe the spoken language faithfully; preserve names, dates and English terms. Do not translate or invent speech during silence. Previous transcript for spelling context only: ${previous.slice(-600)}`;
}