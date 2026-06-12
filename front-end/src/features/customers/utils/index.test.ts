import { calculateAge, truncateFullName } from './index';

describe('calculateAge', () => {
  it('returns 0 for null', () => {
    expect(calculateAge(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(calculateAge(undefined)).toBe(0);
  });

  it('returns 0 for an invalid date string', () => {
    expect(calculateAge('not a date')).toBe(0);
  });

  it('returns the correct age for a birth date N years ago', () => {
    const today = new Date();
    const twentyYearsAgo = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());
    expect(calculateAge(twentyYearsAgo.toISOString())).toBe(20);
  });

  it('accepts a Dayjs instance', () => {
    const today = new Date();
    const tenYearsAgo = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate());
    expect(calculateAge(tenYearsAgo)).toBe(10);
  });
});

describe('truncateFullName', () => {
  it('returns empty string for empty input', () => {
    expect(truncateFullName('')).toBe('');
  });

  it('returns the input unchanged when it fits in maxLength', () => {
    expect(truncateFullName('Nguyen Van A')).toBe('Nguyen Van A');
  });

  it('returns the input unchanged when it is exactly maxLength', () => {
    // No ellipsis on the boundary — the string still fits.
    expect(truncateFullName('Hello', 5)).toBe('Hello');
  });

  it('truncates and appends an ellipsis for long names', () => {
    const result = truncateFullName('This is a very long customer name', 10);
    expect(result.length).toBe(10);
    expect(result.endsWith('…')).toBe(true);
  });

  it('respects a custom maxLength', () => {
    const result = truncateFullName('Hello World', 6);
    expect(result.length).toBe(6);
    expect(result.endsWith('…')).toBe(true);
    expect(result).toBe('Hello…');
  });

  it('trims trailing whitespace before appending the ellipsis', () => {
    // A naive slice could leave a trailing space; we strip it.
    const result = truncateFullName('Hello World', 6);
    expect(result).not.toMatch(/\s…$/);
  });
});
