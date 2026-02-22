import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

function getEnabledPlatforms() {
    const hasServiceAccount = !!process.env.GOOGLE_APPLICATION_CREDENTIALS || (!!process.env.GOOGLE_CLIENT_EMAIL && !!process.env.GOOGLE_PRIVATE_KEY);
    const tokenPath = join(homedir(), '.search-console-mcp-tokens.enc');
    const hasOAuthTokens = existsSync(tokenPath);
    const isGoogleEnabled = hasServiceAccount || hasOAuthTokens;
    const isBingEnabled = !!process.env.BING_API_KEY;
    return { isGoogleEnabled, isBingEnabled };
}

export function registerPrompts(server: McpServer) {
    const { isGoogleEnabled, isBingEnabled } = getEnabledPlatforms();

    server.prompt(
        "investigate_traffic_drop",
        {
            site_url: z.string().optional().describe("The URL of the site (optional, defaults to env/context)"),
            period: z.string().optional().describe("Period to analyze (default: 'last 28 days')")
        },
        ({ site_url, period = "last 28 days" }) => {
            const steps = [];
            if (isGoogleEnabled) {
                steps.push(`1. Run 'analytics_anomalies' to confirm a drop exists and find the exact date it started.`);
                steps.push(`2. Run 'analytics_time_series' to visualize the trend and check for seasonality.`);
                steps.push(`3. Run 'analytics_drop_attribution' to identify whether the loss is concentrated on mobile or desktop.`);
                steps.push(`4. Fetch the top affected pages by comparing two date ranges around the drop date (use 'analytics_compare_periods').`);
                steps.push(`5. For the top 3 affected pages, run 'inspection_inspect' to check indexing status.`);
            }
            if (isBingEnabled) {
                steps.push(`For Bing: Run 'bing_analytics_detect_anomalies' and 'bing_analytics_drop_attribution'.`);
            }
            steps.push(`Synthesize findings into: when it started, what pages/devices are affected, likely cause, and 3 recommended actions.`);

            return {
                messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `Investigate a traffic drop for ${site_url || "the active site"} over the ${period}.\n\nWorkflow:\n${steps.join("\n")}`
                    }
                }]
            };
        }
    );

    server.prompt(
        "find_quick_wins",
        {
            site_url: z.string().optional().describe("The URL of the site"),
            min_impressions: z.number().optional().describe("Minimum impressions threshold (default: 1000)"),
            date_range: z.string().optional().describe("Date range to analyze (default: 'last 90 days')")
        },
        ({ site_url, min_impressions = 1000, date_range = "last 90 days" }) => {
            const steps = [];
            if (isGoogleEnabled) {
                steps.push(`1. Run 'seo_striking_distance' to get candidates in positions 8-15.`);
                steps.push(`2. Run 'seo_low_hanging_fruit' to get candidates in positions 5-20 with high impressions (min ${min_impressions}).`);
                steps.push(`3. For the top 5 candidates, run 'pagespeed_analyze' to check performance.`);
            }
            if (isBingEnabled) {
                 steps.push(`For Bing: Run 'bing_striking_distance' and 'bing_opportunity_finder'.`);
            }
            steps.push(`Output a ranked action list: page URL, current position, impressions, what to fix, expected impact.`);

            return {
                messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `Find quick win SEO opportunities for ${site_url || "the active site"} (${date_range}).\n\nWorkflow:\n${steps.join("\n")}`
                    }
                }]
            };
        }
    );

    server.prompt(
        "full_site_audit",
        {
            site_url: z.string().optional().describe("The URL of the site"),
            brand_terms: z.string().optional().describe("Comma-separated brand terms"),
            date_range: z.string().optional().describe("Date range to analyze (default: 'last 90 days')")
        },
        ({ site_url, brand_terms, date_range = "last 90 days" }) => {
            const steps = [];
            if (isGoogleEnabled) {
                steps.push(`1. Get 'sites_list' to confirm the property is accessible.`);
                if (brand_terms) steps.push(`2. Run 'seo_brand_vs_nonbrand' with regex '${brand_terms.replace(/,/g, '|')}' to see the split.`);
                steps.push(`3. Run 'seo_cannibalization' to flag any competing pages.`);
                steps.push(`4. Run 'seo_lost_queries' to flag any queries that dropped to zero traffic.`);
                steps.push(`5. Run 'seo_low_ctr_opportunities' to find pages ranking well but not getting clicked.`);
                steps.push(`6. List all sitemaps ('sitemaps_list') and flag any with errors.`);
            }
            if (isBingEnabled) {
                steps.push(`For Bing: Run 'bing_sites_health', 'bing_crawl_issues', and 'bing_seo_recommendations'.`);
            }
            steps.push(`Synthesize into an executive summary: overall health score, top 3 wins, top 3 risks, recommended priority order.`);

            return {
                messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `Perform a full site audit for ${site_url || "the active site"} (${date_range}).\n\nWorkflow:\n${steps.join("\n")}`
                    }
                }]
            };
        }
    );

    server.prompt(
        "analyze_page",
        {
            page_url: z.string().describe("The page URL to analyze"),
            date_range: z.string().optional().describe("Date range to analyze (default: 'last 28 days')")
        },
        ({ page_url, date_range = "last 28 days" }) => {
            const steps = [];
             if (isGoogleEnabled) {
                steps.push(`1. Run 'inspection_inspect' for indexing status and mobile usability.`);
                steps.push(`2. Run 'analytics_query' filtered to this page (and query dimension) for clicks, impressions, CTR, position.`);
                steps.push(`3. Run 'analytics_trends' for this page to see if it is rising or falling.`);
                steps.push(`4. Run 'pagespeed_analyze' for performance audit.`);
                steps.push(`5. Run 'schema_validate' to check structured data.`);
             }
             if (isBingEnabled) {
                steps.push(`For Bing: Run 'bing_url_info' and 'bing_analytics_page_query' for this page.`);
             }
            steps.push(`Synthesize: is this page healthy? What is its biggest limiting factor right now (rankings, CTR, speed, or indexing)?`);

            return {
                messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `Deep-dive analysis for page: ${page_url} (${date_range}).\n\nWorkflow:\n${steps.join("\n")}`
                    }
                }]
            };
        }
    );

    server.prompt(
        "platform_comparison",
        {
            site_url: z.string().optional().describe("The URL of the site"),
            date_range: z.string().optional().describe("Date range (default: 'last 28 days')"),
            min_impressions: z.number().optional().describe("Minimum impressions (default: 500)")
        },
        ({ site_url, date_range = "last 28 days", min_impressions = 500 }) => {
            const steps = [];
            if (isGoogleEnabled && isBingEnabled) {
                steps.push(`1. Run 'compare_engines' with dimension='query' to get the full side-by-side ranking table.`);
                steps.push(`2. Identify the top 10 queries where Bing rank is significantly better than Google rank.`);
                steps.push(`3. Identify the top 10 queries where Google rank is significantly better than Bing rank.`);
                steps.push(`4. Run brand analysis across both platforms (using 'seo_brand_vs_nonbrand' for Google and manual check for Bing).`);
                steps.push(`Synthesize: which platform needs more attention, what the cross-platform opportunity is worth, and 3 specific actions.`);
            } else {
                 steps.push(`Note: This workflow requires both Google and Bing to be enabled.`);
            }

            return {
                messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `Compare Google and Bing performance for ${site_url || "the active site"}.\n\nWorkflow:\n${steps.join("\n")}`
                    }
                }]
            };
        }
    );

    server.prompt(
        "content_opportunity_report",
        {
            site_url: z.string().optional().describe("The URL of the site"),
            date_range: z.string().optional().describe("Date range (default: 'last 90 days')")
        },
        ({ site_url, date_range = "last 90 days" }) => {
            const steps = [];
            if (isGoogleEnabled) {
                steps.push(`1. Run 'seo_low_ctr_opportunities' - good rankings but poor CTR means the title/meta needs work.`);
                steps.push(`2. Run 'seo_cannibalization' - check if competing pages dilute authority.`);
                steps.push(`3. Run 'seo_lost_queries' - topics you used to rank for but no longer do represent content decay.`);
            }
             if (isBingEnabled) {
                steps.push(`For Bing: Run 'bing_low_ctr_opportunities'.`);
            }
            steps.push(`Synthesize into three buckets: "optimize existing" (low CTR fixes), "consolidate" (cannibalization fixes), "revive or create" (lost queries + content gaps).`);

            return {
                messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `Generate a content opportunity report for ${site_url || "the active site"}.\n\nWorkflow:\n${steps.join("\n")}`
                    }
                }]
            };
        }
    );

    server.prompt(
        "executive_summary",
        {
            site_url: z.string().optional().describe("The URL of the site"),
            brand_terms: z.string().optional().describe("Brand terms for segmentation"),
            date_range: z.string().optional().describe("Date range (default: 'last 28 days')"),
            compare_to: z.string().optional().describe("Comparison period (default: 'previous period')")
        },
        ({ site_url, brand_terms, date_range = "last 28 days", compare_to = "previous period" }) => {
            const steps = [];
            if (isGoogleEnabled) {
                steps.push(`1. Run 'analytics_compare_periods' (current vs previous period) to get the top-level trend.`);
                if (brand_terms) steps.push(`2. Run 'seo_brand_vs_nonbrand' with regex '${brand_terms}' - brand-heavy traffic is a risk indicator.`);
                steps.push(`3. Run 'analytics_anomalies' to surface any spikes or drops worth flagging.`);
            }
            if (isBingEnabled) {
                 steps.push(`For Bing: Run 'bing_analytics_compare_periods' and 'bing_analytics_detect_anomalies'.`);
            }
            steps.push(`Synthesize into: one-paragraph performance narrative, three bullet wins, three bullet risks, five recommended actions ranked by impact, one key metric to watch next month.`);

            return {
                messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `Generate an executive SEO summary for ${site_url || "the active site"}.\n\nWorkflow:\n${steps.join("\n")}`
                    }
                }]
            };
        }
    );
}
