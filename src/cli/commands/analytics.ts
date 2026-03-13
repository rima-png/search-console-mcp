import * as analytics from "../../google/tools/analytics.js";
import * as bingAnalytics from "../../bing/tools/analytics.js";
import * as ga4Analytics from "../../ga4/tools/analytics.js";
import { formatRecords, OutputMode, RawRecord } from "../output/formatter.js";

export interface AnalyticsQueryRawArgs {
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions?: string[];
  type?: "web" | "image" | "video" | "news" | "discover" | "googleNews";
  aggregationType?: "auto" | "byProperty" | "byPage";
  dataState?: "final" | "all";
  limit?: number;
  startRow?: number;
  filters?: Array<{ dimension: string; operator: string; expression: string }>;
}

export type AnalyticsQueryRecord = RawRecord;

export async function getAnalyticsQueryRawRecords(args: AnalyticsQueryRawArgs): Promise<AnalyticsQueryRecord[]> {
  const result = await analytics.queryAnalytics(args);

  return result.map((row) => {
    const newRow: Record<string, unknown> = { ...row };
    if (row.keys && Array.isArray(row.keys)) {
      row.keys.forEach((keyVal, idx) => {
        const dimName = args.dimensions && args.dimensions[idx]
          ? args.dimensions[idx]
          : `dimension_${idx + 1}`;
        newRow[dimName] = keyVal;
      });
      delete newRow.keys;
    }
    return newRow;
  });
}

export interface BingAnalyticsQueryRawArgs {
  siteUrl: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export async function getBingAnalyticsQueryRawRecords(args: BingAnalyticsQueryRawArgs): Promise<RawRecord[]> {
  let results = await bingAnalytics.getQueryStats(args.siteUrl, args.startDate, args.endDate);
  if (args.limit) {
    results = results.slice(0, args.limit);
  }
  return results.map((row) => ({ ...row })) as RawRecord[];
}

export interface Ga4PagePerformanceRawArgs {
  propertyId: string;
  accountId?: string;
  startDate: string;
  endDate: string;
  pagePath?: string;
  limit?: number;
  offset?: number;
}

export async function getGa4PagePerformanceRawRecords(args: Ga4PagePerformanceRawArgs): Promise<RawRecord[]> {
  const result = await ga4Analytics.getPagePerformance(
    args.propertyId,
    args.startDate,
    args.endDate,
    args.pagePath,
    args.limit,
    args.accountId,
    args.offset
  );
  return result.map((row: Record<string, unknown>) => ({ ...row })) as RawRecord[];
}

export async function runAnalyticsQueryCli(args: AnalyticsQueryRawArgs, mode: OutputMode): Promise<string> {
  const records = await getAnalyticsQueryRawRecords(args);
  return formatRecords(records, mode);
}

export async function runBingAnalyticsQueryCli(args: BingAnalyticsQueryRawArgs, mode: OutputMode): Promise<string> {
  const records = await getBingAnalyticsQueryRawRecords(args);
  return formatRecords(records, mode);
}

export async function runGa4PagePerformanceCli(args: Ga4PagePerformanceRawArgs, mode: OutputMode): Promise<string> {
  const records = await getGa4PagePerformanceRawRecords(args);
  return formatRecords(records, mode);
}
