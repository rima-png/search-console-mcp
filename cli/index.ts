#!/usr/bin/env node
import 'dotenv/config';
import { createLegacyCommandAdapters } from '../src/cli/adapters.js';
import { routeLegacyCommand } from '../src/cli/router.js';
import { applyGlobalFlags, parseGlobalFlags } from '../src/cli/global-flags.js';

function printHelp(): void {
  console.log(`Search Console CLI\n\nUsage:\n  search-console-mcp <command> [options]\n\nLegacy commands:\n  setup\n  accounts\n  account\n  login\n  logout\n  auth\n  diagnostics\n  sites
  config`);
}

async function main() {
  const parsed = parseGlobalFlags(process.argv.slice(2));
  const argv = applyGlobalFlags(parsed);
  const command = argv[0];
  const handled = await routeLegacyCommand(command, argv.slice(1), await createLegacyCommandAdapters());

  if (handled) {
    return;
  }

  printHelp();
  process.exitCode = command ? 1 : 0;
}

main().catch((error) => {
  console.error('Fatal error in CLI dispatcher:', error);
  process.exit(1);
});
