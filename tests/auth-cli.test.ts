import { beforeEach, describe, expect, it, vi } from 'vitest';
import { main } from '../src/auth.js';

vi.mock('../src/common/auth/config.js', () => ({
  loadConfig: vi.fn(),
  removeAccount: vi.fn()
}));

vi.mock('../src/google/client.js', () => ({
  logout: vi.fn()
}));

describe('auth CLI commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prints account status from unified config', async () => {
    const { loadConfig } = await import('../src/common/auth/config.js');
    vi.mocked(loadConfig).mockResolvedValue({
      accounts: {
        google_1: {
          id: 'google_1',
          alias: 'user@example.com',
          engine: 'google',
          tokens: { refresh_token: 'rt' },
          isLegacy: false
        },
        legacy_bing: {
          id: 'legacy_bing',
          alias: 'Bing API Key (env)',
          engine: 'bing',
          isLegacy: true,
          apiKey: 'redacted'
        }
      }
    } as any);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await main(['status']);

    const output = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(output.summary.total).toBe(2);
    expect(output.accounts[1].legacy).toBe(true);
    expect(output.storage.config).toContain('.search-console-mcp-config.enc');
  });

  it('revokes google accounts via logout helper', async () => {
    const { loadConfig } = await import('../src/common/auth/config.js');
    const { logout } = await import('../src/google/client.js');

    vi.mocked(loadConfig).mockResolvedValue({
      accounts: {
        google_1: {
          id: 'google_1',
          alias: 'user@example.com',
          engine: 'google'
        }
      }
    } as any);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await main(['revoke', '--account=google_1']);

    expect(logout).toHaveBeenCalledWith('google_1');
    expect(JSON.parse(consoleSpy.mock.calls[0][0]).success).toBe(true);
  });

  it('revokes non-google accounts via config removal', async () => {
    const { loadConfig, removeAccount } = await import('../src/common/auth/config.js');
    vi.mocked(loadConfig).mockResolvedValue({
      accounts: {
        bing_1: {
          id: 'bing_1',
          alias: 'Bing 1',
          engine: 'bing'
        }
      }
    } as any);

    await main(['revoke', '--all']);

    expect(removeAccount).toHaveBeenCalledWith('bing_1');
  });
});
