import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const GLOBAL_CONFIG_DIR = join(homedir(), '.search-console-mcp');
const GLOBAL_CONFIG_PATH = join(GLOBAL_CONFIG_DIR, 'config.json');
const PROJECT_CONFIG_PATH = '.search-console-mcp.json';

function readConfig(path: string): Record<string, unknown> {
  if (!existsSync(path)) {
    return {};
  }

  const raw = readFileSync(path, 'utf8');
  if (!raw.trim()) {
    return {};
  }

  return JSON.parse(raw) as Record<string, unknown>;
}

function writeConfig(path: string, config: Record<string, unknown>): void {
  if (path === GLOBAL_CONFIG_PATH && !existsSync(GLOBAL_CONFIG_DIR)) {
    mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true, mode: 0o700 });
  }

  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
}

function setByPath(target: Record<string, unknown>, key: string, value: unknown): void {
  const parts = key.split('.').filter(Boolean);
  if (parts.length === 0) {
    return;
  }

  let cursor: Record<string, unknown> = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    const child = cursor[part];

    if (!child || typeof child !== 'object' || Array.isArray(child)) {
      cursor[part] = {};
    }

    cursor = cursor[part] as Record<string, unknown>;
  }

  cursor[parts[parts.length - 1]] = value;
}

function getByPath(target: Record<string, unknown>, key: string): unknown {
  const parts = key.split('.').filter(Boolean);
  let cursor: unknown = target;

  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor) || !(part in cursor)) {
      return undefined;
    }

    cursor = (cursor as Record<string, unknown>)[part];
  }

  return cursor;
}

function parseValue(raw: string): unknown {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null') return null;

  const asNumber = Number(raw);
  if (!Number.isNaN(asNumber) && raw.trim() !== '') {
    return asNumber;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function parseScope(args: string[]) {
  const isProject = args.includes('--project');
  const filtered = args.filter((arg) => arg !== '--project' && arg !== '--global');
  return {
    path: isProject ? PROJECT_CONFIG_PATH : GLOBAL_CONFIG_PATH,
    scope: isProject ? 'project' : 'global',
    args: filtered
  };
}

export async function main(args: string[]): Promise<void> {
  const [subcommand, ...rest] = args;
  const { path, scope, args: scopedArgs } = parseScope(rest);

  if (subcommand === 'set') {
    const [key, ...valueParts] = scopedArgs;
    const rawValue = valueParts.join(' ').trim();

    if (!key || rawValue.length === 0) {
      console.log(JSON.stringify({
        error: 'Missing arguments',
        usage: 'search-console-mcp config set <key> <value> [--project|--global]'
      }, null, 2));
      return;
    }

    const config = readConfig(path);
    setByPath(config, key, parseValue(rawValue));
    writeConfig(path, config);

    console.log(JSON.stringify({ success: true, scope, path, key, value: getByPath(config, key) }, null, 2));
    return;
  }

  if (subcommand === 'get') {
    const [key] = scopedArgs;
    if (!key) {
      console.log(JSON.stringify({
        error: 'Missing arguments',
        usage: 'search-console-mcp config get <key> [--project|--global]'
      }, null, 2));
      return;
    }

    const config = readConfig(path);
    const value = getByPath(config, key);

    console.log(JSON.stringify({ scope, path, key, value }, null, 2));
    return;
  }

  console.log(JSON.stringify({
    error: 'Unknown config command',
    supported: ['set', 'get'],
    usage: {
      set: 'search-console-mcp config set <key> <value> [--project|--global]',
      get: 'search-console-mcp config get <key> [--project|--global]'
    }
  }, null, 2));
}
