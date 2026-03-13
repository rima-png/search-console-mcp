import { describe, expect, it } from 'vitest';
import { formatRecords } from '../src/cli/output/formatter.js';

describe('cli output formatter', () => {
  const records = [
    { site: 'https://example.com', clicks: 120, ctr: 0.2, active: true },
    { site: 'https://example.org', clicks: 98, ctr: 0.15, active: false }
  ];

  it('formats json output consistently', () => {
    expect(formatRecords(records, 'json')).toMatchSnapshot();
  });

  it('formats csv output consistently', () => {
    expect(formatRecords(records, 'csv')).toMatchSnapshot();
  });

  it('formats tsv output consistently', () => {
    expect(formatRecords(records, 'tsv')).toMatchSnapshot();
  });

  it('formats table output consistently', () => {
    expect(formatRecords(records, 'table')).toMatchSnapshot();
  });

  it('formats empty table as no rows marker', () => {
    expect(formatRecords([], 'table')).toBe('(no rows)');
  });
});
