import { describe, it, expect, vi } from 'vitest';
import { routeLegacyCommand, shouldStartMcp } from '../src/cli/router.js';
import { LegacyCommandAdapters } from '../src/cli/adapters.js';

function createAdapters() {
  const adapters: LegacyCommandAdapters = {
    setup: vi.fn(async () => {}),
    accounts: vi.fn(async (_args: string[]) => {}),
    logout: vi.fn(async () => {}),
    login: vi.fn(async () => {}),
    diagnostics: vi.fn(async () => {}),
    sites: vi.fn(async () => {})
  };

  return adapters;
}

describe('CLI command routing compatibility', () => {
  it('keeps MCP mode active when no command is provided', () => {
    expect(shouldStartMcp(undefined)).toBe(true);
  });

  it('routes legacy commands through shared adapters', async () => {
    const adapters = createAdapters();

    expect(await routeLegacyCommand('setup', [], adapters)).toBe(true);
    expect(adapters.setup).toHaveBeenCalledTimes(1);

    expect(await routeLegacyCommand('accounts', ['list'], adapters)).toBe(true);
    expect(adapters.accounts).toHaveBeenCalledWith(['list']);

    expect(await routeLegacyCommand('account', ['list'], adapters)).toBe(true);
    expect(adapters.accounts).toHaveBeenCalledWith(['list']);

    expect(await routeLegacyCommand('login', [], adapters)).toBe(true);
    expect(adapters.login).toHaveBeenCalledTimes(1);

    expect(await routeLegacyCommand('logout', [], adapters)).toBe(true);
    expect(adapters.logout).toHaveBeenCalledTimes(1);

    expect(await routeLegacyCommand('diagnostics', [], adapters)).toBe(true);
    expect(adapters.diagnostics).toHaveBeenCalledTimes(1);

    expect(await routeLegacyCommand('sites', [], adapters)).toBe(true);
    expect(adapters.sites).toHaveBeenCalledTimes(1);
  });

  it('does not consume unknown commands as legacy commands', async () => {
    const adapters = createAdapters();
    expect(await routeLegacyCommand('unknown-command', [], adapters)).toBe(false);
  });
});
