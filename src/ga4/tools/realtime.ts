import { getGA4Client } from '../client.js';
import { formatRows } from '../utils.js';

export async function getRealtimeData(propertyId: string) {
    const client = await getGA4Client(propertyId);

    const response = await client.runRealtimeReport({
        dimensions: [
            { name: 'unifiedScreenName' },
            { name: 'country' },
            { name: 'deviceCategory' }
        ],
        metrics: [
            { name: 'activeUsers' }
        ],
        limit: 50
    });

    return formatRows(response);
}
