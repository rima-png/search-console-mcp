export interface ParsedGlobalFlags {
  argv: string[];
  credentialsPath?: string;
}

export function parseGlobalFlags(argv: string[]): ParsedGlobalFlags {
  const normalized: string[] = [];
  let credentialsPath: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg.startsWith('--credentials=')) {
      credentialsPath = arg.slice('--credentials='.length);
      continue;
    }

    if (arg === '--credentials') {
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        credentialsPath = next;
        i += 1;
      }
      continue;
    }

    normalized.push(arg);
  }

  return { argv: normalized, credentialsPath };
}

export function applyGlobalFlags(parsed: ParsedGlobalFlags): string[] {
  if (parsed.credentialsPath) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = parsed.credentialsPath;
  }

  return parsed.argv;
}
