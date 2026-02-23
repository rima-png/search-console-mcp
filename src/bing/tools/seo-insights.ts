import { getQueryStats, getPageStats, getQueryPageStats } from './analytics.js';
import { BingQueryStats, BingPageStats, BingQueryPageStats } from '../client.js';

export interface BingSEOInsight {
    type: 'opportunity' | 'warning' | 'success';
    category: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    data?: Record<string, unknown>;
}

export interface BingLowHangingFruit {
    query: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
    potentialClicks: number;
}

/**
 * Find "low-hanging fruit" keywords in Bing.
 */
export async function findLowHangingFruit(
    siteUrl: string,
    options: { minImpressions?: number; limit?: number; queryStats?: BingQueryStats[] } = {}
): Promise<BingLowHangingFruit[]> {
    const { minImpressions = 100, limit = 50, queryStats } = options;

    const rows = queryStats || await getQueryStats(siteUrl);

    // Filter for low-hanging fruit: position 5-20, high impressions
    const candidates = rows
        .filter(row => {
            const position = row.AvgPosition;
            const impressions = row.Impressions;
            return position >= 5 && position <= 20 && impressions >= minImpressions;
        })
        .map(row => {
            const position = row.AvgPosition;
            const impressions = row.Impressions;
            const clicks = row.Clicks;
            const ctr = row.CTR;

            // Estimate potential clicks if moved to top 3 (conservative 15% CTR)
            const potentialClicks = Math.round(impressions * 0.15) - clicks;

            return {
                query: row.Query,
                impressions,
                clicks,
                ctr,
                position,
                potentialClicks: Math.max(0, potentialClicks)
            };
        })
        .sort((a, b) => b.potentialClicks - a.potentialClicks)
        .slice(0, limit);

    return candidates;
}

/**
 * Find keywords ranking just off page 1 in Bing (positions 8-15).
 */
export async function findStrikingDistance(
    siteUrl: string,
    options: { limit?: number; queryStats?: BingQueryStats[] } = {}
): Promise<BingQueryStats[]> {
    const { limit = 50, queryStats } = options;

    const rows = queryStats || await getQueryStats(siteUrl);

    return rows
        .filter(r => r.AvgPosition >= 8 && r.AvgPosition <= 15)
        .sort((a, b) => b.Impressions - a.Impressions)
        .slice(0, limit);
}

/**
 * Identify queries where the site ranks well but has low CTR in Bing.
 */
export async function findLowCTROpportunities(
    siteUrl: string,
    options: { minImpressions?: number; limit?: number; queryStats?: BingQueryStats[] } = {}
): Promise<Array<BingQueryStats & { benchmarkCtr: number }>> {
    const { minImpressions = 500, limit = 50, queryStats } = options;

    const rows = queryStats || await getQueryStats(siteUrl);

    // Approximate benchmarks for CTR by position (simplified)
    const benchmarks: Record<number, number> = {
        1: 0.30, 2: 0.15, 3: 0.10, 4: 0.06, 5: 0.04,
        6: 0.03, 7: 0.02, 8: 0.015, 9: 0.01, 10: 0.01
    };

    return rows
        .filter(r => r.Impressions > minImpressions && r.AvgPosition <= 10)
        .map(r => {
            const pos = Math.round(r.AvgPosition);
            const benchmark = benchmarks[pos] || 0.01;
            return {
                ...r,
                benchmarkCtr: benchmark
            };
        })
        .filter(item => item.CTR < (item.benchmarkCtr * 0.6))
        .sort((a, b) => b.Impressions - a.Impressions)
        .slice(0, limit);
}

/**
 * Detect keyword cannibalization in Bing where multiple pages compete for the same query.
 */
export async function detectCannibalization(
    siteUrl: string,
    options: { minImpressions?: number; limit?: number } = {}
): Promise<any[]> {
    const { minImpressions = 50, limit = 30 } = options;

    const rows = await getQueryPageStats(siteUrl);

    // Group by query
    const queryMap = new Map<string, any[]>();

    for (const row of rows) {
        if (row.Impressions < minImpressions) continue;

        if (!queryMap.has(row.Query)) {
            queryMap.set(row.Query, []);
        }

        queryMap.get(row.Query)!.push({
            page: row.Page,
            clicks: row.Clicks,
            impressions: row.Impressions,
            date: row.Date
        });
    }

    const cannibalization: any[] = [];

    for (const [query, pages] of queryMap) {
        if (pages.length >= 2) {
            pages.sort((a, b) => b.clicks - a.clicks);
            const totalClicks = pages.reduce((sum, p) => sum + p.clicks, 0);
            const totalImpressions = pages.reduce((sum, p) => sum + p.impressions, 0);

            // Calculate conflict score
            const shares = pages.map(p => totalClicks > 0 ? p.clicks / totalClicks : 0);
            const hhi = shares.reduce((sum, s) => sum + s * s, 0);
            const conflictScore = 1 - hhi;

            if (conflictScore > 0.1 || pages[1].impressions > (pages[0].impressions * 0.2)) {
                cannibalization.push({
                    query,
                    pages,
                    totalClicks,
                    totalImpressions,
                    clickShareConflict: parseFloat(conflictScore.toFixed(2))
                });
            }
        }
    }

    return cannibalization
        .sort((a, b) => (b.totalClicks * b.clickShareConflict) - (a.totalClicks * a.clickShareConflict))
        .slice(0, limit);
}

/**
 * Generate prioritized Bing SEO recommendations.
 */
export async function generateRecommendations(
    siteUrl: string
): Promise<BingSEOInsight[]> {
    const insights: BingSEOInsight[] = [];

    const queryStatsPromise = getQueryStats(siteUrl);

    const [lowHangingFruit, strikingDistance, lowCTR, cannibalization] = await Promise.all([
        queryStatsPromise.then(stats => findLowHangingFruit(siteUrl, { limit: 10, queryStats: stats })),
        queryStatsPromise.then(stats => findStrikingDistance(siteUrl, { limit: 10, queryStats: stats })),
        queryStatsPromise.then(stats => findLowCTROpportunities(siteUrl, { limit: 10, queryStats: stats })),
        detectCannibalization(siteUrl, { limit: 10 })
    ]);

    if (lowHangingFruit.length > 0) {
        const totalPotential = lowHangingFruit.reduce((sum, l) => sum + l.potentialClicks, 0);
        insights.push({
            type: 'opportunity',
            category: 'Rankings',
            title: `${lowHangingFruit.length} High-Potential Bing Keywords`,
            description: `Keywords ranking 5-20 with high volume. Moving these to top 3 could add ~${totalPotential} clicks.`,
            priority: 'high',
            data: { topKeywords: lowHangingFruit.slice(0, 5).map(l => l.query) }
        });
    }

    if (lowCTR.length > 0) {
        insights.push({
            type: 'opportunity',
            category: 'CTR',
            title: `Low CTR on ${lowCTR.length} Top Bing Rankings`,
            description: `You rank on page 1 but get fewer clicks than expected. Consider improving titles and meta descriptions.`,
            priority: 'medium',
            data: { topQueries: lowCTR.slice(0, 5).map(q => q.Query) }
        });
    }

    if (cannibalization.length > 0) {
        insights.push({
            type: 'warning',
            category: 'Content',
            title: `${cannibalization.length} Bing Cannibalization Issues`,
            description: `Multiple pages are competing for the same keywords in Bing. Consider consolidating content.`,
            priority: 'medium',
            data: { topIssues: cannibalization.slice(0, 3).map(c => c.query) }
        });
    }

    if (strikingDistance.length > 0) {
        insights.push({
            type: 'opportunity',
            category: 'Quick Wins',
            title: `${strikingDistance.length} Keywords near Bing Page 1`,
            description: `Keywords ranking 8-15. A small boost could move these into high-visibility positions.`,
            priority: 'medium',
            data: { queries: strikingDistance.slice(0, 5).map(q => q.Query) }
        });
    }

    const order = { high: 0, medium: 1, low: 2 };
    return insights.sort((a, b) => order[a.priority] - order[b.priority]);
}
