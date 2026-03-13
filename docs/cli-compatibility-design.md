# CLI Compatibility Design

## Goals
- Preserve `src/index.ts` as the MCP stdio bootstrap path for existing integrations.
- Introduce a separate human-facing CLI entrypoint in `cli/index.ts`.
- Reuse the same command adapters for legacy operational commands (`setup`, `accounts`, `login`, `logout`, `diagnostics`, `sites`) to avoid behavior drift.

## Routing Strategy
1. **Shared adapters** live in `src/cli/adapters.ts` and encapsulate command execution.
2. **Shared router** in `src/cli/router.ts` resolves command strings to adapters.
3. `src/index.ts` invokes the shared router first; if no legacy command is matched, it proceeds to start MCP transport on stdio.
4. `cli/index.ts` invokes the same shared router and otherwise shows CLI help.

## Bin Compatibility
- Keep existing `search-console-mcp` bin mapped to MCP bootstrap semantics.
- Add a second bin (`search-console-cli`) mapped to the new CLI dispatcher.
- Add a secondary TypeScript build config (`tsconfig.cli.json`) so `cli/index.ts` compiles into `dist/cli/index.js` without changing the existing main build layout.

## Regression Coverage
Add `tests/cli-routing.test.ts` to validate:
- no subcommand means MCP mode should continue (`shouldStartMcp(undefined)` is true),
- each legacy command is routed through adapters successfully,
- unknown commands are not consumed by legacy routing.
