import { describe, it, expect } from 'vitest';
import { formatBRL, formatCardNumber } from '../utils/formatters';

describe('formatBRL', () => {
  it('formats positive numbers as BRL currency', () => {
    const formatted = formatBRL(10.5);
    // Should contain R$ and 10,50
    expect(formatted).toContain('10,50');
  });

  it('formats zero correctly', () => {
    const formatted = formatBRL(0);
    expect(formatted).toContain('0,00');
  });

  it('handles null and undefined gracefully', () => {
    expect(formatBRL(null)).toContain('0,00');
    expect(formatBRL(undefined)).toContain('0,00');
  });

  it('handles string decimals correctly', () => {
    expect(formatBRL('123.45')).toContain('123,45');
  });
});

describe('formatCardNumber', () => {
  it('pads numeric strings with zeros to 3 digits', () => {
    expect(formatCardNumber('1')).toBe('001');
    expect(formatCardNumber('12')).toBe('012');
    expect(formatCardNumber('123')).toBe('123');
    expect(formatCardNumber(5)).toBe('005');
  });

  it('preserves alphanumeric card codes', () => {
    expect(formatCardNumber('VIP-1')).toBe('VIP-1');
  });
});
