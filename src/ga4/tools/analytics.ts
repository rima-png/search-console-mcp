import { getGA4Client } from '../client.js';
import { formatRows } from '../utils.js';

const CACHE_TTL_MS = 60 * 1000; // 60 seconds
const MAX_CACHE_SIZE = 100;

interface CacheValue {
    type: 'resolved';
    data: any;
    timestamp: number;
}

interface CachePending {
    type: 'pending';
    promise: Promise<any>;
}

type CacheEntry = CacheValue | CachePending;

const analyticsCache = new Map<string, CacheEntry>();

export function clearAnalyticsCache() {
    analyticsCache.clear();
}

function generateCacheKey(options: any): string {
    return JSON.stringify(options, Object.keys(options).sort());
}

export interface GA4AnalyticsOptions {
    propertyId: string;
    startDate?: string;
    endDate?: string;
    dimensions?: string[];
    metrics?: string[];
    dimensionFilter?: any;
    metricFilter?: any;
    limit?: number;
    offset?: number;
    orderBys?: any[];
}

export interface GA4BatchAnalyticsOptions {
    propertyId: string;
    requests: Array<{
        dateRanges?: { startDate: string; endDate: string }[];
        dimensions?: string[];
        metrics?: string[];
        dimensionFilter?: any;
        metricFilter?: any;
        limit?: number;
        offset?: number;
        orderBys?: any[];
    }>;
}

export async function batchQueryAnalytics(options: GA4BatchAnalyticsOptions) {
    const cacheKey = generateCacheKey(options);
    const now = Date.now();
    const cached = analyticsCache.get(cacheKey);

    if (cached) {
        if (cached.type === 'pending') {
            return cached.promise;
        }
        if (now - cached.timestamp < CACHE_TTL_MS) {
            return cached.data;
        }
        analyticsCache.delete(cacheKey);
    }

    const fetchPromise = (async () => {
        try {
            const client = await getGA4Client(options.propertyId);
            const response = await client.batchRunReports({
                requests: options.requests.map(req => ({
                    dateRanges: req.dateRanges,
                    dimensions: req.dimensions?.map(name => ({ name })),
                    metrics: req.metrics?.map(name => ({ name })),
                    dimensionFilter: req.dimensionFilter,
                    metricFilter: req.metricFilter,
                    limit: req.limit,
                    offset: req.offset,
                    orderBys: req.orderBys
                }))
            });

            analyticsCache.set(cacheKey, {
                type: 'resolved',
                data: response,
                timestamp: Date.now()
            });

            if (analyticsCache.size > MAX_CACHE_SIZE) {
                const firstKey = analyticsCache.keys().next().value;
                if (firstKey) analyticsCache.delete(firstKey);
            }

            return response;
        } catch (error) {
            analyticsCache.delete(cacheKey);
            throw error;
        }
    })();

    analyticsCache.set(cacheKey, { type: 'pending', promise: fetchPromise });
    return fetchPromise;
}

export async function queryAnalytics(options: GA4AnalyticsOptions) {
    const cacheKey = generateCacheKey(options);
    const now = Date.now();
    const cached = analyticsCache.get(cacheKey);

    if (cached) {
        if (cached.type === 'pending') {
            return cached.promise;
        }
        if (now - cached.timestamp < CACHE_TTL_MS) {
            return cached.data;
        }
        analyticsCache.delete(cacheKey);
    }

    const fetchPromise = (async () => {
        try {
            const client = await getGA4Client(options.propertyId);
            const response = await client.runReport({
                dateRanges: options.startDate ?
                    [{ startDate: options.startDate, endDate: options.endDate || 'today' }] : undefined,
                dimensions: options.dimensions?.map(name => ({ name })),
                metrics: options.metrics?.map(name => ({ name })),
                dimensionFilter: options.dimensionFilter,
                metricFilter: options.metricFilter,
                limit: options.limit,
                offset: options.offset,
                orderBys: options.orderBys
            });

            analyticsCache.set(cacheKey, {
                type: 'resolved',
                data: response,
                timestamp: Date.now()
            });

            if (analyticsCache.size > MAX_CACHE_SIZE) {
                const firstKey = analyticsCache.keys().next().value;
                if (firstKey) analyticsCache.delete(firstKey);
            }

            return response;
        } catch (error) {
            analyticsCache.delete(cacheKey);
            throw error;
        }
    })();

    analyticsCache.set(cacheKey, { type: 'pending', promise: fetchPromise });
    return fetchPromise;
}

export async function getPagePerformance(
    propertyId: string,
    startDate: string,
    endDate: string,
    pagePath?: string,
    limit: number = 50
) {
    const dimensionFilter = pagePath ? {
        filter: {
            fieldName: 'pagePath',
            stringFilter: {
                matchType: 'CONTAINS',
                value: pagePath
            }
        }
    } : undefined;

    const response = await queryAnalytics({
        propertyId,
        startDate,
        endDate,
        dimensions: ['pagePath'],
        metrics: [
            'sessions',
            'screenPageViews',
            'bounceRate',
            'averageSessionDuration',
            'conversions',
            'newUsers',
            'engagementRate'
        ],
        dimensionFilter,
        limit,
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
    });

    return formatRows(response);
}

export async function getTrafficSources(
    propertyId: string,
    startDate: string,
    endDate: string,
    channelGroup?: string,
    limit: number = 50
) {
    const dimensionFilter = channelGroup ? {
        filter: {
            fieldName: 'sessionDefaultChannelGroup',
            stringFilter: {
                matchType: 'EXACT',
                value: channelGroup,
                caseSensitive: false
            }
        }
    } : undefined;

    const response = await queryAnalytics({
        propertyId,
        startDate,
        endDate,
        dimensions: ['sessionDefaultChannelGroup', 'sessionSource', 'sessionMedium'],
        metrics: ['sessions'],
        dimensionFilter,
        limit,
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
    });

    return formatRows(response);
}

export async function getOrganicLandingPages(
    propertyId: string,
    startDate: string,
    endDate: string,
    limit: number = 50
) {
    const response = await queryAnalytics({
        propertyId,
        startDate,
        endDate,
        dimensions: ['landingPagePlusQueryString'],
        metrics: [
            'sessions',
            'bounceRate',
            'conversions',
            'engagementRate',
            'averageSessionDuration'
        ],
        dimensionFilter: {
            filter: {
                fieldName: 'sessionDefaultChannelGroup',
                stringFilter: {
                    matchType: 'EXACT',
                    value: 'Organic Search' // or 'Organic' depending on GA4 version/setup, usually 'Organic Search' in default channel group
                }
            }
        },
        limit,
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
    });

    return formatRows(response);
}

export async function getContentPerformance(
    propertyId: string,
    startDate: string,
    endDate: string,
    limit: number = 50
) {
    // Try to query content group first?
    // Not sure if contentGroup is standard. 'contentGroup' is a standard dimension.
    // If not used, it might return (not set).

    const response = await queryAnalytics({
        propertyId,
        startDate,
        endDate,
        dimensions: ['contentGroup'], // Fallback to pagePath if needed? No, separate tool or option.
        metrics: ['sessions', 'averageSessionDuration', 'conversions'],
        limit,
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
    });

    return formatRows(response);
}

export async function getEcommerce(
    propertyId: string,
    startDate: string,
    endDate: string,
    limit: number = 50
) {
    const response = await queryAnalytics({
        propertyId,
        startDate,
        endDate,
        dimensions: ['itemName'],
        metrics: ['itemRevenue', 'itemsPurchased', 'ecommercePurchases'],
        limit,
        orderBys: [{ metric: { metricName: 'itemRevenue' }, desc: true }]
    });

    // Check if we have data. If total revenue is 0 across all rows, maybe return warning.
    const rows = formatRows(response);
    if (rows.length === 0 || (rows.length > 0 && rows.every((r: Record<string, number>) => r.itemRevenue === 0 && r.itemsPurchased === 0))) {
        return {
            warning: "No ecommerce data found for this property.",
            rows: []
        };
    }

    return rows;
}
