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

## Adapter-first execution plan

Roadmap execution for CLI work should always start by adapting existing MCP/tool modules before introducing new business logic.

1. Inventory existing tool modules first (Google, Bing, GA4, and shared common tools).
2. For each planned CLI command, map command handling to an existing module/function.
3. Only add new core logic when no equivalent tool exists; place shared reusable logic in `src/common` so both MCP tools and CLI adapters consume the same implementation.
4. Keep the tracking matrix below updated as commands are planned or implemented.

## Tool module inventory

### `src/google/tools`

- `advanced-analytics.ts`
- `analytics.ts`
- `inspection.ts`
- `pagespeed.ts`
- `seo-insights.ts`
- `sitemaps.ts`
- `sites-health.ts`
- `sites.ts`
- `support.ts`

### `src/bing/tools`

- `advanced-analytics.ts`
- `analytics.ts`
- `crawl.ts`
- `index-now.ts`
- `inspection.ts`
- `keywords.ts`
- `links.ts`
- `seo-insights.ts`
- `sitemaps.ts`
- `sites-health.ts`
- `sites.ts`
- `url-submission.ts`

### `src/ga4/tools`

- `analytics.ts`
- `behavior.ts`
- `pagespeed.ts`
- `properties.ts`
- `realtime.ts`

### `src/common/tools`

- `compare-engines/adapters.ts`
- `compare-engines/comparator.ts`
- `compare-engines/ga4-adapters.ts`
- `compare-engines/ga4-gsc-bing-comparator.ts`
- `compare-engines/ga4-gsc-comparator.ts`
- `compare-engines/index.ts`
- `compare-engines/normalizer.ts`
- `compare-engines/signals.ts`
- `compare-engines/types.ts`
- `compare-engines/utils.ts`
- `get-started.ts`
- `schema-validator.ts`
- `seo-primitives.ts`

## CLI adapter tracking matrix

| CLI command | backing module | new logic required (Y/N) |
| --- | --- | --- |
| `setup` | `src/setup.ts#main` (via `src/cli/adapters.ts`) | N |
| `login` | `src/setup.ts#login` (via `src/cli/adapters.ts`) | N |
| `logout` | `src/setup.ts#runLogout` (via `src/cli/adapters.ts`) | N |
| `accounts` / `account` | `src/accounts.ts#main` (via `src/cli/adapters.ts`) | N |
| `sites` | `src/accounts.ts#main(['list'])` (via `src/cli/adapters.ts`) | N |
| `auth` | `src/auth.ts#main` (via `src/cli/adapters.ts`) | N |
| `diagnostics` | `src/common/diagnostics.ts#runDiagnostics` (via `src/cli/adapters.ts`) | N |
| `analytics query` (planned) | `src/google/tools/analytics.ts#queryAnalytics` via `src/cli/commands/analytics.ts#getAnalyticsQueryRawRecords` | N |
| `bing analytics query` (planned) | `src/bing/tools/analytics.ts#getQueryStats` via `src/cli/commands/analytics.ts#getBingAnalyticsQueryRawRecords` | N |
| `ga4 page-performance` (planned) | `src/ga4/tools/analytics.ts#getPagePerformance` via `src/cli/commands/analytics.ts#getGa4PagePerformanceRawRecords` | N |
