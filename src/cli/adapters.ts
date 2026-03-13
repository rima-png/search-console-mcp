import { runDiagnostics } from "../common/diagnostics.js";

export type LegacyCommand = 'setup' | 'account' | 'accounts' | 'logout' | 'login' | 'diagnostics' | 'sites';

export interface LegacyCommandAdapters {
  setup: () => Promise<void>;
  accounts: (args: string[]) => Promise<void>;
  logout: () => Promise<void>;
  login: () => Promise<void>;
  diagnostics: () => Promise<void>;
  sites: () => Promise<void>;
}

export async function createLegacyCommandAdapters(): Promise<LegacyCommandAdapters> {
  return {
    setup: async () => {
      const { main } = await import('../setup.js');
      await main();
    },
    accounts: async (args: string[]) => {
      const { main } = await import('../accounts.js');
      await main(args);
    },
    logout: async () => {
      const { runLogout } = await import('../setup.js');
      await runLogout();
    },
    login: async () => {
      const { login } = await import('../setup.js');
      await login();
    },
    diagnostics: async () => {
      const results = await runDiagnostics();
      console.log(JSON.stringify(results, null, 2));
    },
    sites: async () => {
      const { main } = await import('../accounts.js');
      await main(['list']);
    }
  };
}
