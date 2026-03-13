#!/usr/bin/env node
import 'dotenv/config';
import { createLegacyCommandAdapters } from '../src/cli/adapters.js';
import { routeLegacyCommand } from '../src/cli/router.js';

function printHelp(): void {
  console.log(`Search Console CLI\n\nUsage:\n  search-console-cli <command> [options]\n\nLegacy commands:\n  setup\n  accounts\n  account\n  login\n  logout\n  auth\n  diagnostics\n  sites`);
}

async function main() {
  const command = process.argv[2];
  const handled = await routeLegacyCommand(command, process.argv.slice(3), await createLegacyCommandAdapters());

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
