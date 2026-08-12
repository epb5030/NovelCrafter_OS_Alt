export interface TravelResult {
  miles: number;
  leagues: number;
  durationDays: string;
  startName: string;
  endName: string;
}

export const TRAVEL_SPEEDS: Record<string, number> = {
  foot: 20,
  horse: 40,
  carriage: 30,
  ship: 60,
  flight: 120,
  portal: 0,
};

export function calculateSpatialTravel(
  p1: { x: number; y: number; title: string },
  p2: { x: number; y: number; title: string },
  travelMode: 'foot' | 'horse' | 'carriage' | 'ship' | 'flight' | 'portal' | string = 'horse'
): TravelResult {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const rawDist = Math.sqrt(dx * dx + dy * dy);

  const miles = Math.round(rawDist * 5);
  const leagues = Math.round(miles / 3);

  const speed = TRAVEL_SPEEDS[travelMode] ?? 40;
  const durationDays = speed > 0 ? (miles / speed).toFixed(1) : 'Instant';

  return { miles, leagues, durationDays, startName: p1.title, endName: p2.title };
}

export interface ProseMetrics {
  wordCount: number;
  sentenceCount: number;
  readingTimeMinutes: number;
  adverbPercentage: number;
}

export function calculateProseMetrics(prose: string): ProseMetrics {
  if (!prose || !prose.trim()) {
    return { wordCount: 0, sentenceCount: 0, readingTimeMinutes: 0, adverbPercentage: 0 };
  }

  const words = prose.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const sentences = prose.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length || 1;

  // Average reading speed: 250 words / minute
  const readingTimeMinutes = Math.ceil(wordCount / 250);

  // Simple adverb heuristic: words ending in 'ly' (excluding common non-adverbs like 'family', 'friendly', 'only', etc.)
  const adverbs = words.filter(w => {
    const clean = w.toLowerCase().replace(/[^a-z]/g, '');
    return clean.endsWith('ly') && !['family', 'friendly', 'only', 'lonely', 'ugly', 'silly', 'holy', 'early', 'reply', 'apply'].includes(clean);
  });

  const adverbPercentage = wordCount > 0 ? Math.round((adverbs.length / wordCount) * 1000) / 10 : 0;

  return { wordCount, sentenceCount, readingTimeMinutes, adverbPercentage };
}
