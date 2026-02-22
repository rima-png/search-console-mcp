import { getOrganicLandingPages } from './analytics.js';
import { analyzePageSpeed } from '../../google/tools/pagespeed.js';

export async function getPageSpeedCorrelation(
    propertyId: string,
    domain: string,
    startDate: string,
    endDate: string,
    limit: number = 5,
    strategy: 'mobile' | 'desktop' = 'mobile',
    accountId?: string
) {
    // Normalize domain
    let baseUrl = domain.trim();
    if (!baseUrl.startsWith('http')) {
        baseUrl = `https://${baseUrl}`;
    }
    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
    }

    // 1. Get top organic landing pages
    const pages = await getOrganicLandingPages(propertyId, startDate, endDate, limit, accountId);

    // 2. Run PageSpeed on each
    const results = await Promise.allSettled(
        pages.map(async (page: any) => {
            const path = page.landingPagePlusQueryString || page.pagePath;
            if (!path) throw new Error("No page path found");

            const fullUrl = `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

            const psiResult = await analyzePageSpeed(fullUrl, strategy);
            return {
                ...page,
                pageSpeed: psiResult
            };
        })
    );

    // 3. Merge
    return results.map((res, index) => {
        if (res.status === 'fulfilled') {
            return res.value;
        } else {
            return {
                ...pages[index],
                pageSpeedError: res.reason?.message || "Failed to analyze"
            };
        }
    });
}
