import { loadConfig, removeAccount } from './common/auth/config.js';
import { logout } from './google/client.js';

function parseFlags(args: string[]): Record<string, string | boolean> {
  const flags: Record<string, string | boolean> = {};
  for (const arg of args) {
    if (!arg.startsWith('--')) {
      continue;
    }

    const [rawKey, value] = arg.slice(2).split('=');
    if (!rawKey) {
      continue;
    }

    flags[rawKey] = value ?? true;
  }
  return flags;
}

function findAccount(accounts: Record<string, any>, identifier: string) {
  if (accounts[identifier]) {
    return accounts[identifier];
  }

  return Object.values(accounts).find(
    (account: any) => account.alias?.toLowerCase() === identifier.toLowerCase() || account.id === identifier
  );
}

async function authStatus() {
  const config = await loadConfig();
  const accounts = Object.values(config.accounts);

  const response = {
    accounts: accounts.map((account: any) => ({
      id: account.id,
      alias: account.alias,
      engine: account.engine,
      websites: account.websites || [],
      legacy: !!account.isLegacy,
      hasServiceAccountPath: !!account.serviceAccountPath,
      hasApiKey: !!account.apiKey,
      hasTokens: !!account.tokens?.refresh_token || !!account.tokens?.access_token
    })),
    summary: {
      total: accounts.length,
      google: accounts.filter((a) => a.engine === 'google').length,
      bing: accounts.filter((a) => a.engine === 'bing').length,
      ga4: accounts.filter((a) => a.engine === 'ga4').length
    },
    storage: {
      config: '~/.search-console-mcp-config.enc',
      tokens: 'OS keychain (fallback: encrypted account config)'
    }
  };

  console.log(JSON.stringify(response, null, 2));
}

async function authRevoke(args: string[]) {
  const flags = parseFlags(args);
  const positional = args.filter((arg) => !arg.startsWith('--'));
  const identifier = (flags.account as string) || (flags.id as string) || positional[0];
  const revokeAll = !!flags.all;

  const config = await loadConfig();
  const allAccounts = Object.values(config.accounts) as any[];

  let accountsToRevoke: any[] = [];
  if (revokeAll) {
    accountsToRevoke = allAccounts;
  } else if (identifier) {
    const account = findAccount(config.accounts, identifier);
    if (!account) {
      console.log(JSON.stringify({
        error: 'Account not found',
        message: `No account matching '${identifier}' was found.`,
        resolution: 'Run: search-console-mcp auth status'
      }, null, 2));
      return;
    }
    accountsToRevoke = [account];
  } else {
    console.log(JSON.stringify({
      error: 'Missing arguments',
      message: 'Provide --account=<alias|id> to revoke a single account, or --all to revoke every account.',
      resolution: {
        single: 'search-console-mcp auth revoke --account=<alias_or_id>',
        all: 'search-console-mcp auth revoke --all'
      }
    }, null, 2));
    return;
  }

  for (const account of accountsToRevoke) {
    if (account.engine === 'google') {
      await logout(account.id);
      continue;
    }

    await removeAccount(account.id);
  }

  console.log(JSON.stringify({
    success: true,
    revoked: accountsToRevoke.map((account) => ({
      id: account.id,
      alias: account.alias,
      engine: account.engine
    }))
  }, null, 2));
}

export async function main(args: string[]) {
  const subcommand = args[0] || 'status';

  if (subcommand === 'status') {
    await authStatus();
    return;
  }

  if (subcommand === 'revoke') {
    await authRevoke(args.slice(1));
    return;
  }

  console.log(JSON.stringify({
    error: 'Unknown auth command',
    message: `'${subcommand}' is not a valid auth subcommand.`,
    resolution: {
      status: 'search-console-mcp auth status',
      revoke: 'search-console-mcp auth revoke --account=<alias_or_id>',
      revoke_all: 'search-console-mcp auth revoke --all'
    }
  }, null, 2));
}
