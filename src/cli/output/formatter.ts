import { jsonToCsv } from "../../common/utils/csv.js";

export type OutputMode = "table" | "json" | "csv" | "tsv";
export type RawRecord = Record<string, unknown>;

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  return JSON.stringify(value);
}

function collectHeaders(records: RawRecord[]): string[] {
  const headerSet = new Set<string>();
  for (const record of records) {
    Object.keys(record).forEach((key) => headerSet.add(key));
  }
  return Array.from(headerSet);
}

function toSeparatedValues(records: RawRecord[], delimiter: "," | "\t"): string {
  if (records.length === 0) {
    return "";
  }

  if (delimiter === ",") {
    return jsonToCsv(records);
  }

  const headers = collectHeaders(records);
  const lines = [headers.join(delimiter)];

  for (const row of records) {
    lines.push(headers.map((header) => normalizeValue(row[header])).join(delimiter));
  }

  return lines.join("\n");
}

function toTable(records: RawRecord[]): string {
  if (records.length === 0) {
    return "(no rows)";
  }

  const headers = collectHeaders(records);
  const rows = records.map((row) => headers.map((header) => normalizeValue(row[header])));
  const widths = headers.map((header, idx) => Math.max(header.length, ...rows.map((row) => row[idx].length)));

  const formatLine = (cols: string[]) => cols.map((col, idx) => col.padEnd(widths[idx])).join(" | ");
  const separator = widths.map((width) => "-".repeat(width)).join("-+-");

  return [
    formatLine(headers),
    separator,
    ...rows.map((row) => formatLine(row))
  ].join("\n");
}

export function formatRecords(records: RawRecord[], mode: OutputMode): string {
  switch (mode) {
    case "json":
      return JSON.stringify(records, null, 2);
    case "csv":
      return toSeparatedValues(records, ",");
    case "tsv":
      return toSeparatedValues(records, "\t");
    case "table":
      return toTable(records);
    default:
      return JSON.stringify(records, null, 2);
  }
}
