import { LegacyCommand, LegacyCommandAdapters } from './adapters.js';

const legacyCommands: LegacyCommand[] = ['setup', 'account', 'accounts', 'logout', 'login', 'auth', 'diagnostics', 'sites'];

export function shouldStartMcp(command?: string): boolean {
  return !command || !legacyCommands.includes(command as LegacyCommand);
}

export async function routeLegacyCommand(
  command: string | undefined,
  args: string[],
  adapters: LegacyCommandAdapters
): Promise<boolean> {
  if (!command) {
    return false;
  }

  switch (command) {
    case 'setup':
      await adapters.setup();
      return true;
    case 'account':
    case 'accounts':
      await adapters.accounts(args);
      return true;
    case 'logout':
      await adapters.logout();
      return true;
    case 'login':
      await adapters.login();
      return true;
    case 'auth':
      await adapters.auth(args);
      return true;
    case 'diagnostics':
      await adapters.diagnostics();
      return true;
    case 'sites':
      await adapters.sites();
      return true;
    default:
      return false;
  }
}
