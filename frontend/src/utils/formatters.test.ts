import { describe, it, expect } from 'vitest';
import { formatBRL, formatCardNumber, formatDateTime } from './formatters';

describe('formatBRL', () => {
  it('formats numbers to BRL currency string', () => {
    const formatted = formatBRL(12.5);
    // Expect R$ and 12,50 with non-breaking or normal space
    expect(formatted).toMatch(/R\$\s*12,50/);
  });

  it('handles zero correctly', () => {
    const formatted = formatBRL(0);
    expect(formatted).toMatch(/R\$\s*0,00/);
  });

  it('handles null and undefined gracefully', () => {
    expect(formatBRL(null)).toBe('R$ 0,00');
    expect(formatBRL(undefined)).toBe('R$ 0,00');
  });

  it('handles string decimal numbers correctly', () => {
    const formatted = formatBRL('99.99');
    expect(formatted).toMatch(/R\$\s*99,99/);
  });

  it('handles invalid strings gracefully', () => {
    expect(formatBRL('invalid')).toBe('R$ 0,00');
  });
});

describe('formatCardNumber', () => {
  it('pads single digit numbers to 3 digits', () => {
    expect(formatCardNumber(1)).toBe('001');
    expect(formatCardNumber('5')).toBe('005');
  });

  it('pads double digit numbers to 3 digits', () => {
    expect(formatCardNumber(42)).toBe('042');
    expect(formatCardNumber('89')).toBe('089');
  });

  it('keeps 3 or more digits intact', () => {
    expect(formatCardNumber(100)).toBe('100');
    expect(formatCardNumber('1234')).toBe('1234');
  });

  it('keeps non-numeric codes as string without error', () => {
    expect(formatCardNumber('VIP-1')).toBe('VIP-1');
  });
});

describe('formatDateTime', () => {
  it('returns - for null or undefined', () => {
    expect(formatDateTime(null)).toBe('-');
    expect(formatDateTime(undefined)).toBe('-');
    expect(formatDateTime('')).toBe('-');
  });

  it('formats valid ISO date strings', () => {
    const result = formatDateTime('2026-10-20T15:30:00Z');
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});
