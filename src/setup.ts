#!/usr/bin/env node
import 'dotenv/config';
import { readFileSync, existsSync, statSync, writeFileSync } from 'fs';
import { resolve, dirname, extname, join } from 'path';
import { createInterface } from 'readline';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { startLocalFlow, saveTokens, getUserEmail, logout, loadTokens, getSearchConsoleClient, DEFAULT_CLIENT_ID, DEFAULT_CLIENT_SECRET } from './google/client.js';
import { getBingClient } from './bing/client.js';
import { colors, printBoxHeader, printStatusLine } from './utils/ui.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}


function printHeader() {
    printBoxHeader('Setup Wizard');
}

function printStep(num: number, text: string) {
    console.log(`\n${colors.bold}${colors.cyan}Step ${num}${colors.reset} ${colors.dim}─${colors.reset} ${colors.bold}${text}${colors.reset}\n`);
}

function printSuccess(text: string) {
    console.log(`${colors.green}✔${colors.reset} ${text}`);
}

function printError(text: string) {
    console.log(`${colors.red}✘${colors.reset} ${colors.bold}${text}${colors.reset}`);
}

function printInfo(text: string) {
    console.log(`${colors.blue}ℹ${colors.reset} ${colors.dim}${text}${colors.reset}`);
}

async function detectConfig() {
    const results = {
        googleOAuth: false,
        googleServiceAccount: false,
        bing: false,
    };

    // 1. Google OAuth
    try {
        const tokens = await loadTokens();
        if (tokens) results.googleOAuth = true;
    } catch (e) { }

    // 2. Google Service Account
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)) {
        results.googleServiceAccount = true;
    }

    // 3. Bing
    if (process.env.BING_API_KEY) results.bing = true;

    return results;
}

function printDetectionSummary(results: any) {
    const googleConnected = results.googleOAuth || results.googleServiceAccount;
    const bingConnected = results.bing;

    console.log(`${colors.bold}${colors.dim}🔍 Connection Status${colors.reset}\n`);

    printStatusLine('Google', googleConnected);
    printStatusLine('Bing', bingConnected);
    console.log('');
}

interface ServiceAccountKey {
    type: string;
    project_id: string;
    private_key_id: string;
    private_key: string;
    client_email: string;
    client_id: string;
    auth_uri: string;
    token_uri: string;
}

export function validateKeyFile(path: string): ServiceAccountKey | null {
    try {
        const sanitizedPath = path.trim().replace(/\0/g, '');
        const expandedPath = sanitizedPath.startsWith('~')
            ? sanitizedPath.replace('~', homedir())
            : sanitizedPath;
        const fullPath = resolve(expandedPath);

        if (!existsSync(fullPath)) {
            printError(`File not found: ${fullPath}`);
            return null;
        }

        const stats = statSync(fullPath);
        if (!stats.isFile()) {
            printError(`Not a regular file: ${fullPath}`);
            return null;
        }

        if (extname(fullPath).toLowerCase() !== '.json') {
            printError(`Invalid file type. Please provide a .json file.`);
            return null;
        }

        const content = readFileSync(fullPath, 'utf-8');
        const key = JSON.parse(content) as ServiceAccountKey;

        const required = ['type', 'project_id', 'client_email', 'private_key'];
        const missing = required.filter(f => !(f in key));

        if (missing.length > 0) {
            printError(`Missing required fields: ${missing.join(', ')}`);
            return null;
        }

        if (key.type !== 'service_account') {
            printError(`Invalid key type: ${key.type}. Expected 'service_account'`);
            return null;
        }

        return key;
    } catch (error) {
        printError(`Failed to parse JSON: ${(error as Error).message}`);
        return null;
    }
}

export async function testConnection(keyPath: string): Promise<boolean> {
    try {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = resolve(keyPath.replace('~', homedir()));
        const { google } = await import('googleapis');
        const auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
        });
        await auth.getClient();
        return true;
    } catch (error) {
        printError(`Authentication failed: ${(error as Error).message}`);
        return false;
    }
}

export function showConfigSnippets(credentialsPath: string) {
    console.log('\nAdd this to your MCP client configuration:\n');
    console.log(JSON.stringify({
        mcpServers: {
            "search-console": {
                command: "npx",
                args: ["-y", "search-console-mcp"],
                env: {
                    GOOGLE_APPLICATION_CREDENTIALS: credentialsPath
                }
            }
        }
    }, null, 2));
}

export function resolveRepo(dirname: string): string {
    let repo = '';
    try {
        const url = execSync('git remote get-url origin', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        repo = url
            .replace(/^git@github\.com:|^https:\/\/github\.com\//, '')
            .replace(/\.git$/, '');
    } catch {
        // Fallback to package.json
        const pkgPath = resolve(dirname, '../package.json');
        if (existsSync(pkgPath)) {
            const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
            if (pkg.repository?.url) {
                repo = pkg.repository.url.replace(/.*github\.com\//, '').replace(/\.git$/, '');
            } else if (pkg.mcpName && pkg.mcpName.includes('/')) {
                repo = pkg.mcpName.replace(/^io\.github\./, '').split('/').slice(-2).join('/');
            }
        }
    }
    return repo;
}

export async function login() {
    printHeader();
    printStep(1, 'Browser Authorization');

    console.log('Using Secure Desktop Flow.');
    console.log('Note: We will automatically fetch your email to support multiple accounts.');

    // Use centralized defaults
    const clientId = DEFAULT_CLIENT_ID;
    const clientSecret = DEFAULT_CLIENT_SECRET;

    try {
        const tokens = await startLocalFlow(clientId, clientSecret);

        printInfo('Fetching account information...');
        const email = await getUserEmail(tokens);

        await saveTokens(tokens, email);
        printSuccess(`Successfully authenticated as ${email}!`);
        printInfo('Tokens are stored securely in your system keychain.');

        printStep(2, 'Configure your MCP client');
        showOAuth2ConfigSnippets(clientId, clientSecret);

        await supportProject();
        rl.close();
    } catch (error) {
        printError(`Authentication failed: ${(error as Error).message}`);
        console.log('\nTip: Ensure you are using a "Desktop Application" Client ID type in the Cloud Console.');
        process.exit(1);
    }
}

export async function runLogout() {
    printHeader();
    printInfo('Logging out and clearing secure credentials...');

    // Get email from CLI args if provided: search-console-mcp logout user@gmail.com
    const email = process.argv[3];

    try {
        await logout(email);
        if (email) {
            printSuccess(`Successfully logged out and removed credentials for ${email}.`);
        } else {
            printSuccess('Successfully logged out from default account.');
        }
    } catch (error) {
        printError(`Logout failed: ${(error as Error).message}`);
    }
    rl.close();
}

function showOAuth2ConfigSnippets(clientId: string, clientSecret: string) {
    console.log('\nAdd this to your MCP client configuration:\n');
    console.log(JSON.stringify({
        mcpServers: {
            "search-console": {
                command: "npx",
                args: ["-y", "search-console-mcp"],
                env: {
                    GOOGLE_CLIENT_ID: clientId,
                    GOOGLE_CLIENT_SECRET: clientSecret
                }
            }
        }
    }, null, 2));
}

async function setupServiceAccount() {
    printStep(1, 'Locate your service account JSON key file');

    console.log('If you don\'t have one yet, follow these steps:');
    console.log('  1. Go to https://console.cloud.google.com/iam-admin/serviceaccounts');
    console.log('  2. Create a new service account (or select existing)');
    console.log('  3. Click "Keys" > "Add Key" > "Create new key" > "JSON"');
    console.log('  4. Save the downloaded JSON file\n');

    const keyPath = await ask('Enter the path to your JSON key file: ');

    if (!keyPath) {
        printError('No credentials file provided.');
        process.exit(1);
    }

    const key = validateKeyFile(keyPath);
    if (!key) {
        process.exit(1);
    }

    printSuccess('JSON key file is valid!');
    const serviceAccountEmail = key.client_email;
    const credentialsPath = resolve(keyPath.replace('~', homedir()));

    printStep(2, 'Add service account to Google Search Console');
    console.log('You need to add this email as a user in Google Search Console:\n');
    console.log(`  📧 ${serviceAccountEmail}\n`);
    console.log('Steps:');
    console.log('  1. Go to https://search.google.com/search-console');
    console.log('  2. Select your property');
    console.log('  3. Click "Settings" > "Users and permissions" > "Add user"');
    console.log(`  4. Enter: ${serviceAccountEmail}`);
    console.log('  5. Set permission to "Full" or "Restricted" and click "Add"\n');

    await ask('Press Enter when you\'ve added the service account to Search Console...');

    printStep(3, 'Test connection');
    console.log('Testing authentication with Google APIs...');
    const connected = await testConnection(credentialsPath);

    if (connected) {
        printSuccess('Authentication successful!');
    } else {
        process.exit(1);
    }

    printStep(4, 'Configure your MCP client');
    showConfigSnippets(credentialsPath);
    console.log('\n🎉 Setup complete! You can now use Search Console MCP.\n');

    await supportProject();
    rl.close();
}

async function supportProject() {
    const answer = await ask('\nWould you like to star the repo on GitHub? (Y/n): ');
    if (answer === '' || answer.toLowerCase().startsWith('y')) {
        try {
            const repo = resolveRepo(__dirname);
            if (repo && /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repo)) {
                execSync(`gh api -X PUT /user/starred/${repo}`, { stdio: 'ignore' });
                printSuccess('Thanks for your support! ⭐');
            } else {
                console.log('🔗 https://github.com/saurabhsharma2u/search-console-mcp');
            }
        } catch (error) {
            console.log('🔗 https://github.com/saurabhsharma2u/search-console-mcp');
        }
    }
}

async function setupBing() {
    printStep(1, 'Get your Bing Webmaster Tools API Key');
    console.log('If you don\'t have one yet:');
    console.log('  1. Go to https://www.bing.com/webmasters/settings/api');
    console.log('  2. Log in with your Microsoft account');
    console.log('  3. Click "API Key" and copy it\n');

    const apiKey = await ask('Enter your Bing API Key: ');

    if (!apiKey) {
        printError('No API Key provided.');
        return;
    }

    printSuccess('Bing API Key captured!');

    printStep(2, 'Configure your MCP client');
    console.log('\nAdd this to your MCP client configuration (e.g., Claude Desktop config):\n');
    console.log(JSON.stringify({
        mcpServers: {
            "search-console": {
                command: "npx",
                args: ["-y", "search-console-mcp"],
                env: {
                    BING_API_KEY: apiKey
                }
            }
        }
    }, null, 2));

    console.log('\n🎉 Bing setup information displayed above.');
    await supportProject();
    rl.close();
}

async function checkAndShowSites(engine: 'google' | 'bing', configStatus: any): Promise<boolean> {
    const isConnected = engine === 'google' ? (configStatus.googleOAuth || configStatus.googleServiceAccount) : configStatus.bing;
    if (!isConnected) return true;

    const label = engine === 'google' ? 'Google Search Console' : 'Bing Webmaster Tools';
    console.log(`${colors.green}✔ ${label} is already connected!${colors.reset}`);

    try {
        if (engine === 'google') {
            const client = await getSearchConsoleClient();
            const response = await client.sites.list();
            const sites = response.data.siteEntry || [];
            console.log(`\n${colors.bold}Your verified Google sites:${colors.reset}`);
            sites.slice(0, 10).forEach(s => {
                let displayUrl = (s.siteUrl || '').trim();
                if (displayUrl.startsWith('sc-domain:')) {
                    displayUrl = displayUrl.substring(10);
                } else if (displayUrl.startsWith('sc-ptr:')) {
                    displayUrl = displayUrl.substring(7);
                }
                console.log(`  • ${displayUrl}`);
            });
            if (sites.length > 10) console.log(`  ... and ${sites.length - 10} more`);
        } else {
            const client = await getBingClient();
            const sites = await client.getSiteList();
            console.log(`\n${colors.bold}Your verified Bing sites:${colors.reset}`);
            sites.slice(0, 10).forEach(s => console.log(`  • ${s.Url}`));
            if (sites.length > 10) console.log(`  ... and ${sites.length - 10} more`);
        }
    } catch (e) {
        console.log(`${colors.dim} (Could not fetch site list)${colors.reset}`);
    }

    const reconf = await ask(`\nWould you like to reconfigure ${label.split(' ')[0]}? (y/N): `);
    return reconf.toLowerCase().startsWith('y');
}

async function handleGoogleFlow(configStatus: any, forceSubMenu = false) {
    if (!forceSubMenu) {
        const shouldProceed = await checkAndShowSites('google', configStatus);
        if (!shouldProceed) {
            console.log(`\n${colors.green}✔${colors.reset} ${colors.bold}Configuration untouched. You're ready to roll!${colors.reset}`);
            rl.close();
            return;
        }
    }
    await googleSubMenu(configStatus);
}

async function handleBingFlow(configStatus: any) {
    const shouldProceed = await checkAndShowSites('bing', configStatus);
    if (!shouldProceed) {
        console.log(`\n${colors.green}✔${colors.reset} ${colors.bold}Configuration untouched. You're ready to roll!${colors.reset}`);
        rl.close();
        return;
    }
    await setupBing();
}

export async function main() {
    printHeader();

    const args = process.argv.slice(2);
    const engineFlag = args.find(a => a.startsWith('--engine='))?.split('=')[1]?.toLowerCase();
    const configStatus = await detectConfig();

    if (engineFlag === 'bing') {
        await handleBingFlow(configStatus);
        return;
    } else if (engineFlag === 'google') {
        await handleGoogleFlow(configStatus);
        return;
    }

    printDetectionSummary(configStatus);

    console.log(`${colors.bold}Let’s wire this up. Google or Bing?\nPick your weapon.${colors.reset}`);

    console.log(`\n1. Google Search Console`);
    console.log('2. Bing Webmaster Tools');
    console.log('3. Exit');

    const choice = await ask(`\n${colors.bold}${colors.cyan}Enter your choice (1-3): ${colors.reset}`);

    switch (choice) {
        case '1':
            await handleGoogleFlow(configStatus, true);
            break;
        case '2':
            await handleBingFlow(configStatus);
            break;
        default:
            console.log(`\n${colors.dim}See you on the flip side!${colors.reset}`);
            rl.close();
            break;
    }
}

async function googleSubMenu(configStatus: any) {
    console.log(`\n${colors.bold}Google Search Console Configuration${colors.reset}`);
    console.log(`\n1. Login with Google (OAuth 2.0)`);
    console.log('2. Setup Service Account (JSON Key)');
    console.log('3. Back to main menu');

    const choice = await ask(`\n${colors.bold}${colors.cyan}Enter your choice (1-3): ${colors.reset}`);

    switch (choice) {
        case '1':
            await login();
            break;
        case '2':
            await setupServiceAccount();
            break;
        default:
            await main();
            break;
    }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
    main().catch((error) => {
        console.error('Setup failed:', error);
        process.exit(1);
    });
}
