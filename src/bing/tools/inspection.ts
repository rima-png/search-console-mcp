import { getBingClient, BingUrlInfo } from '../client.js';

/**
 * Get detailed indexing and crawl information for a URL.
 */
export async function getUrlInfo(siteUrl: string, url: string): Promise<BingUrlInfo> {
    const client = await getBingClient(siteUrl);
    return client.getUrlInfo(siteUrl, url);
}
