#!/usr/bin/env node
import 'dotenv/config';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { configureAppServer } from "./app-server.js";
import { loadConfig } from './common/auth/config.js';
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { colors, printBoxHeader, printStatusLine } from './utils/ui.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { runDiagnostics } from "./common/diagnostics.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load version from package.json
let version = "1.0.0";
try {
  const pkgPath = join(__dirname, '../package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  version = pkg.version;
} catch (e) {
  // Fallback for cases where package.json might not be accessible
}

const server = new McpServer({
  name: "search-console-mcp",
  version: version,
});

configureAppServer(server);

async function main() {
  const command = process.argv[2];

  // Handle standalone commands
  if (command === 'setup') {
    const { main: setupMain } = await import('./setup.js');
    await setupMain();
    return;
  }

  if (command === 'account' || command === 'accounts') {
    const { main: accountsMain } = await import('./accounts.js');
    await accountsMain(process.argv.slice(3));
    return;
  }

  if (command === 'logout') {
    const { runLogout } = await import('./setup.js');
    await runLogout();
    return;
  }

  if (command === 'login') {
    const { login } = await import('./setup.js');
    await login();
    return;
  }

  if (command === 'diagnostics') {
    const results = await runDiagnostics();
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  if (command === 'sites') {
    const { main: accountsMain } = await import('./accounts.js');
    await accountsMain(['list']);
    return;
  }

  // Check for credentials
  const config = await loadConfig();
  const accounts = Object.values(config.accounts);

  const hasGoogle = accounts.some(a => a.engine === 'google') ||
    !!process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    (!!process.env.GOOGLE_CLIENT_EMAIL && !!process.env.GOOGLE_PRIVATE_KEY) ||
    existsSync(join(homedir(), '.search-console-mcp-tokens.enc')); // Legacy check

  const hasBing = accounts.some(a => a.engine === 'bing') || !!process.env.BING_API_KEY;
  const hasGA4 = accounts.some(a => a.engine === 'ga4');

  if (!hasGoogle && !hasBing && !hasGA4) {
    printBoxHeader('Authentication', colors.red);

    console.error(`${colors.bold}${colors.dim}🔍 Connection Status:${colors.reset}`);
    printStatusLine('Google', hasGoogle);
    printStatusLine('GA4', hasGA4);
    printStatusLine('Bing', hasBing);
    console.error('');

    if (!hasGoogle) {
      console.error(`${colors.red}✘${colors.reset} ${colors.bold}Google not configured.${colors.reset}`);
      console.error(`${colors.blue}ℹ${colors.reset} ${colors.dim}Run:${colors.reset} ${colors.bold}${colors.cyan}search-console-mcp setup --engine=google${colors.reset}`);
    }

    if (!hasGA4) {
      console.error(`${colors.red}✘${colors.reset} ${colors.bold}GA4 not configured.${colors.reset}`);
      console.error(`${colors.blue}ℹ${colors.reset} ${colors.dim}Run:${colors.reset} ${colors.bold}${colors.cyan}search-console-mcp setup --engine=ga4${colors.reset}`);
    }

    if (!hasBing) {
      console.error(`\n${colors.red}✘${colors.reset} ${colors.bold}Bing not configured.${colors.reset}`);
      console.error(`${colors.blue}ℹ${colors.reset} ${colors.dim}Run:${colors.reset} ${colors.bold}${colors.cyan}search-console-mcp setup --engine=bing${colors.reset}`);
    }

    console.error(`\n${colors.dim}${'─'.repeat(64)}${colors.reset}\n`);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  const googleStatus = hasGoogle ? `${colors.green}✔ Google${colors.reset}` : `${colors.red}✘ Google${colors.reset}`;
  const ga4Status = hasGA4 ? `${colors.green}✔ GA4${colors.reset}` : `${colors.red}✘ GA4${colors.reset}`;
  const bingStatus = hasBing ? `${colors.green}✔ Bing${colors.reset}` : `${colors.red}✘ Bing${colors.reset}`;

  console.error(`Search Console MCP running on stdio [ ${googleStatus} | ${ga4Status} | ${bingStatus} ]`);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
