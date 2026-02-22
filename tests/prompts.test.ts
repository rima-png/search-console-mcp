import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerPrompts } from '../src/prompts/index.js';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as fs from 'fs';
import * as os from 'os';

vi.mock('fs');
vi.mock('os');

describe('Prompts registration', () => {
  const originalEnv = process.env;
  let mockServer: any;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    vi.clearAllMocks();
    (fs.existsSync as any).mockReturnValue(false);
    (os.homedir as any).mockReturnValue('/tmp');

    mockServer = {
      prompt: vi.fn(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should register all prompts', () => {
    registerPrompts(mockServer as McpServer);
    const calls = mockServer.prompt.mock.calls;
    const registeredNames = calls.map((c: any) => c[0]);

    expect(registeredNames).toContain('investigate_traffic_drop');
    expect(registeredNames).toContain('find_quick_wins');
    expect(registeredNames).toContain('full_site_audit');
    expect(registeredNames).toContain('analyze_page');
    expect(registeredNames).toContain('platform_comparison');
    expect(registeredNames).toContain('content_opportunity_report');
    expect(registeredNames).toContain('executive_summary');
  });

  it('should generate Google-specific workflow when Google is enabled', () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = 'fake-path.json';
    delete process.env.BING_API_KEY;

    registerPrompts(mockServer as McpServer);

    // Check investigate_traffic_drop
    const dropPrompt = mockServer.prompt.mock.calls.find((c: any) => c[0] === 'investigate_traffic_drop');
    const dropHandler = dropPrompt[2];
    const dropResult = dropHandler({ site_url: 'http://example.com' });
    expect(dropResult.messages[0].content.text).toContain("Run 'analytics_anomalies'");
    expect(dropResult.messages[0].content.text).not.toContain("For Bing:");

    // Check full_site_audit
    const auditPrompt = mockServer.prompt.mock.calls.find((c: any) => c[0] === 'full_site_audit');
    const auditHandler = auditPrompt[2];
    const auditResult = auditHandler({ site_url: 'http://example.com' });
    expect(auditResult.messages[0].content.text).toContain("Get 'sites_list'");
    expect(auditResult.messages[0].content.text).not.toContain("For Bing:");
  });

  it('should generate Bing-specific workflow when Bing is enabled', () => {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GOOGLE_CLIENT_EMAIL;
    delete process.env.GOOGLE_PRIVATE_KEY;
    process.env.BING_API_KEY = 'fake-key';

    registerPrompts(mockServer as McpServer);

    // Check investigate_traffic_drop
    const dropPrompt = mockServer.prompt.mock.calls.find((c: any) => c[0] === 'investigate_traffic_drop');
    const dropHandler = dropPrompt[2];
    const dropResult = dropHandler({ site_url: 'http://example.com' });
    expect(dropResult.messages[0].content.text).toContain("For Bing: Run 'bing_analytics_detect_anomalies'");
    expect(dropResult.messages[0].content.text).not.toContain("Run 'analytics_anomalies' to confirm");

    // Check full_site_audit
    const auditPrompt = mockServer.prompt.mock.calls.find((c: any) => c[0] === 'full_site_audit');
    const auditHandler = auditPrompt[2];
    const auditResult = auditHandler({ site_url: 'http://example.com' });
    expect(auditResult.messages[0].content.text).toContain("For Bing: Run 'bing_sites_health'");
    expect(auditResult.messages[0].content.text).not.toContain("Get 'sites_list'");
  });
});
