import { describe, it, expect } from 'vitest';
import { calculateSpatialTravel, calculateProseMetrics } from '../utils/storyCalculators';

describe('Spatial Travel Calculator (calculateSpatialTravel)', () => {
  const capital = { x: 10, y: 10, title: 'Emerald Capital' };
  const fortress = { x: 40, y: 50, title: 'Iron Fortress' };

  it('should calculate miles, leagues, and days for horseback travel', () => {
    // dx = 30, dy = 40 => rawDist = 50 units
    // miles = 50 * 5 = 250 miles
    // leagues = 250 / 3 = 83 leagues
    // speed = 40 miles/day => 250 / 40 = 6.2 days
    const result = calculateSpatialTravel(capital, fortress, 'horse');

    expect(result.miles).toBe(250);
    expect(result.leagues).toBe(83);
    expect(result.durationDays).toBe('6.3');
    expect(result.startName).toBe('Emerald Capital');
    expect(result.endName).toBe('Iron Fortress');
  });

  it('should calculate instant duration for portal travel', () => {
    const result = calculateSpatialTravel(capital, fortress, 'portal');

    expect(result.miles).toBe(250);
    expect(result.durationDays).toBe('Instant');
  });

  it('should calculate faster travel time for wyvern flight', () => {
    // speed = 120 miles/day => 250 / 120 = 2.1 days
    const result = calculateSpatialTravel(capital, fortress, 'flight');

    expect(result.durationDays).toBe('2.1');
  });
});

describe('Prose Metrics Calculator (calculateProseMetrics)', () => {
  it('should handle empty prose string', () => {
    const metrics = calculateProseMetrics('');

    expect(metrics.wordCount).toBe(0);
    expect(metrics.sentenceCount).toBe(0);
    expect(metrics.readingTimeMinutes).toBe(0);
    expect(metrics.adverbPercentage).toBe(0);
  });

  it('should calculate word count, sentence count, and reading time', () => {
    const sampleProse = `The rain poured steadily over the citadel wall. Valerius carefully unrolled the ancient parchment, studying the cartographic lines with silent focus. Tomorrow, the expedition begins into the uncharted wild.`;
    const metrics = calculateProseMetrics(sampleProse);

    expect(metrics.wordCount).toBe(29);
    expect(metrics.sentenceCount).toBe(3);
    expect(metrics.readingTimeMinutes).toBe(1);
    expect(metrics.adverbPercentage).toBeGreaterThan(0); // 'steadily', 'carefully'
  });
});
