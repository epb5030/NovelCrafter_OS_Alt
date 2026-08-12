import { describe, it, expect } from 'vitest';
import { computeProseDiff, computeWordTokenDiff } from '../components/DiffViewerModal';

describe('Prose Diff Algorithm (computeProseDiff)', () => {
  it('should return unchanged lines for identical prose', () => {
    const text = 'Chapter 1: The Distant Signal\nCaptain Valerie checked the console.';
    const diff = computeProseDiff(text, text);

    expect(diff.length).toBe(2);
    expect(diff.every(d => d.type === 'unchanged')).toBe(true);
  });

  it('should detect added lines in current prose', () => {
    const oldText = 'Captain Valerie checked the console.';
    const newText = 'Captain Valerie checked the console.\nSuddenly a loud alarm echoed through the deck.';

    const diff = computeProseDiff(oldText, newText);
    expect(diff.some(d => d.type === 'added' && d.text.includes('loud alarm'))).toBe(true);
  });

  it('should detect removed lines from snapshot prose', () => {
    const oldText = 'Line 1\nLine 2 to be removed\nLine 3';
    const newText = 'Line 1\nLine 3';

    const diff = computeProseDiff(oldText, newText);
    expect(diff.some(d => d.type === 'removed' && d.text.includes('Line 2'))).toBe(true);
  });
});

describe('Word Token Diff Algorithm (computeWordTokenDiff)', () => {
  it('should detect word additions and removals within a sentence', () => {
    const oldLine = 'Valerius walked into the dark citadel.';
    const newLine = 'Valerius walked quietly into the bright citadel.';

    const tokens = computeWordTokenDiff(oldLine, newLine);
    expect(tokens.some(t => t.type === 'added' && t.word.includes('quietly'))).toBe(true);
    expect(tokens.some(t => t.type === 'removed' && t.word.includes('dark'))).toBe(true);
    expect(tokens.some(t => t.type === 'added' && t.word.includes('bright'))).toBe(true);
  });
});
