import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createCipheriv, createDecipheriv, scryptSync, randomBytes } from 'crypto';
import nodeMachineId from 'node-machine-id';

const { machineIdSync } = nodeMachineId;

const CONFIG_PATH = join(homedir(), '.search-console-mcp-config.enc');
const LEGACY_TOKEN_PATH = join(homedir(), '.search-console-mcp-tokens.enc');
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

export type EngineType = 'google' | 'bing';

export interface AccountConfig {
    id: string;
    engine: EngineType;
    alias: string;
    websites?: string[];
    // Google specific
    tokens?: {
        refresh_token?: string | null;
        expiry_date?: number | null;
        access_token?: string | null;
    };
    // Bing specific
    apiKey?: string;
    // Metadata for migration
    isLegacy?: boolean;
}

export interface AppConfig {
    accounts: Record<string, AccountConfig>;
}

function getEncryptionKey() {
    const mId = machineIdSync();
    const salt = process.env.USER || 'sc-mcp-salt';
    return scryptSync(mId, salt, 32);
}

function encrypt(text: string): string {
    const iv = randomBytes(12);
    const key = getEncryptionKey();
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(data: string): string {
    const [ivHex, authTagHex, encryptedHex] = data.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getEncryptionKey();
    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

/**
 * Load the unified configuration, including lazy migration from legacy Google tokens.
 */
export async function loadConfig(): Promise<AppConfig> {
    let config: AppConfig = { accounts: {} };

    // 1. Try to load from new unified config
    if (existsSync(CONFIG_PATH)) {
        try {
            const encryptedData = readFileSync(CONFIG_PATH, 'utf-8');
            const decrypted = decrypt(encryptedData);
            config = JSON.parse(decrypted);
        } catch (e) {
            console.error('Failed to load unified config:', (e as Error).message);
        }
    }

    // 2. Performance Lazy Migration from legacy Google tokens
    if (existsSync(LEGACY_TOKEN_PATH)) {
        try {
            const encryptedData = readFileSync(LEGACY_TOKEN_PATH, 'utf-8');
            const decrypted = decrypt(encryptedData);
            const googleTokens = JSON.parse(decrypted);

            for (const [email, tokens] of Object.entries(googleTokens)) {
                const id = `google_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
                if (!config.accounts[id]) {
                    config.accounts[id] = {
                        id,
                        engine: 'google',
                        alias: email,
                        tokens: tokens as any,
                        isLegacy: true
                    };
                }
            }
        } catch (e) {
            // Ignore migration errors
        }
    }

    // 3. Check for Bing Environment Variable (Semi-Legacy)
    const bingApiKey = process.env.BING_API_KEY;
    if (bingApiKey) {
        const id = 'legacy_bing';
        if (!config.accounts[id]) {
            config.accounts[id] = {
                id,
                engine: 'bing',
                alias: 'Environment Variable Account',
                apiKey: bingApiKey,
                isLegacy: true
            };
        }
    }

    return config;
}

export async function saveConfig(config: AppConfig) {
    try {
        const encrypted = encrypt(JSON.stringify(config));
        writeFileSync(CONFIG_PATH, encrypted, { mode: 0o600 });
    } catch (e) {
        console.error('Failed to save config:', (e as Error).message);
        throw e;
    }
}

export async function updateAccount(account: AccountConfig) {
    const config = await loadConfig();
    config.accounts[account.id] = account;
    await saveConfig(config);
}

export async function removeAccount(accountId: string) {
    const config = await loadConfig();
    delete config.accounts[accountId];
    await saveConfig(config);
}
