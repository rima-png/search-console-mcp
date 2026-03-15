/**
 * Vercel serverless MCP endpoint.
 * Uses Streamable HTTP transport for Claude.ai and other MCP clients.
 * Build (npm run build) must run before deploy so dist/app-server.js exists.
 */
import { createMcpHandler } from "mcp-handler";
import { join } from "path";
import { pathToFileURL } from "url";

let handlerPromise: Promise<ReturnType<typeof createMcpHandler>> | null = null;

function getHandler() {
  if (!handlerPromise) {
    handlerPromise = (async () => {
      const distPath = pathToFileURL(join(process.cwd(), "dist", "app-server.js")).href;
      const { configureAppServer } = await import(distPath);
      return createMcpHandler(
        (server) => configureAppServer(server),
        {},
        { basePath: "/api", maxDuration: 60 }
      );
    })();
  }
  return handlerPromise;
}

export async function GET(req: Request, ctx: { params?: Record<string, string> }) {
  const handler = await getHandler();
  return handler(req, ctx);
}
export async function POST(req: Request, ctx: { params?: Record<string, string> }) {
  const handler = await getHandler();
  return handler(req, ctx);
}
export async function DELETE(req: Request, ctx: { params?: Record<string, string> }) {
  const handler = await getHandler();
  return handler(req, ctx);
}
