# CLI Architecture Notes

This document captures canonical implementation module paths used by the CLI entrypoints and adapters.

## Canonical implementation references

- Google API client/auth helpers: `src/google/client.ts`
- Interactive setup/login flow: `src/setup.ts`
- Shared auth persistence + resolution: `src/common/auth/config.ts`, `src/common/auth/resolver.ts`

When describing or extending CLI auth behavior, reference the modules above (not legacy flattened paths).

## Code map

CLI adapters and routing are organized around these modules:

- CLI binary entrypoint: `cli/index.ts`
- Legacy adapter factory: `src/cli/adapters.ts`
- Legacy command router: `src/cli/router.ts`
- Setup/login/logout command implementation: `src/setup.ts`
- Account and sites command implementation: `src/accounts.ts`
- Auth subcommand implementation: `src/auth.ts`
- Google OAuth client module: `src/google/client.ts`
- Auth account config persistence: `src/common/auth/config.ts`
- Auth account resolution helpers: `src/common/auth/resolver.ts`
