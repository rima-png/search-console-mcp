import { describe, it, expect, beforeEach } from 'vitest';
import { applyGlobalFlags, parseGlobalFlags } from '../src/cli/global-flags.js';

describe('CLI global flags', () => {
  const originalCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  beforeEach(() => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = originalCredentials;
  });

  it('extracts --credentials=value and strips it from argv', () => {
    const parsed = parseGlobalFlags(['--credentials=/tmp/key.json', 'auth', 'status']);

    expect(parsed.credentialsPath).toBe('/tmp/key.json');
    expect(parsed.argv).toEqual(['auth', 'status']);
  });

  it('extracts --credentials <value> and strips both tokens', () => {
    const parsed = parseGlobalFlags(['auth', '--credentials', '/tmp/key.json', 'status']);

    expect(parsed.credentialsPath).toBe('/tmp/key.json');
    expect(parsed.argv).toEqual(['auth', 'status']);
  });

  it('applies parsed credentials into GOOGLE_APPLICATION_CREDENTIALS', () => {
    const argv = applyGlobalFlags(parseGlobalFlags(['--credentials=/tmp/key.json', 'sites']));

    expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBe('/tmp/key.json');
    expect(argv).toEqual(['sites']);
  });
});
