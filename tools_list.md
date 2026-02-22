# Available Tools in search-console-mcp

## 📈 Analytics & Performance
| Tool | Description |
| :--- | :--- |
| `analytics_query` | **Master Tool**. Query raw data with full control over dimensions, filters, `aggregationType` (byPage/byProperty), `dataState` (final/all), and `type` (web/image/news/discover). |
| `analytics_performance_summary` | Get high-level aggregate metrics (clicks, impressions, CTR, position) for a date range. |
| `analytics_compare_periods` | Compare performance between two date ranges (e.g., Week-over-Week). |
| `analytics_top_queries` | Get top search queries sorted by clicks or impressions. |
| `analytics_top_pages` | Get top performing pages sorted by clicks or impressions. |
| `analytics_by_country` | Breakdown of performance by country. |
| `analytics_search_appearance` | Breakdown by search appearance (e.g., Rich Results, AMP, Videos). |
| `analytics_trends` | Detect rising or falling trends in your traffic. |
| `analytics_anomalies` | Identify unusual daily spikes or drops in traffic. |
| `analytics_drop_attribution` | **[NEW]** Attribute traffic drops to mobile/desktop or correlate with known Google Algorithm Updates. |
| `analytics_time_series` | **[NEW]** Advanced time series with rolling averages (dynamic window), seasonality strength, and trend forecasting. |

## 🎯 SEO Opportunities (Opinionated)
| Tool | Description |
| :--- | :--- |
| `seo_low_hanging_fruit` | Find keywords ranking in positions 5-20 with high impressions. |
| `seo_striking_distance` | **[NEW]** Find keywords ranking 8-15. These are your easiest ROI wins. |
| `seo_low_ctr_opportunities` | **[NEW]** Find queries ranking Top 10 but with poor CTR (< 60% of benchmark). |
| `seo_lost_queries` | **[NEW]** Identify queries that lost >80% traffic or went to zero in the last period. |
| `seo_cannibalization` | **[Enhanced]** Detect multiple pages competing for the same keywords with a "Conflict Score". |
| `seo_brand_vs_nonbrand` | **[NEW]** Segment your traffic performance using a regex (e.g. `/(nike|air max)/i`). |
| `seo_quick_wins` | Find pages with many keywords ranking on Page 2 that could be pushed to Page 1. |
| `seo_recommendations` | Generate a prioritized list of general SEO recommendations. |

## ⚛️ SEO Primitives (Atoms)
| Tool | Description |
| :--- | :--- |
| `seo_primitive_ranking_bucket` | Categorize a position (e.g. "Top 3", "Page 1"). |
| `seo_primitive_traffic_delta` | Calculate change between two metrics. |
| `seo_primitive_is_brand` | Regex-based brand query check. |
| `seo_primitive_is_cannibalized` | Check overlap between two pages. |

## 🔍 Inspection & Validation
| Tool | Description |
| :--- | :--- |
| `inspection_inspect` | **Google URL Inspection API**. Check index status, crawl errors, and mobile usability real-time. |
| `pagespeed_analyze` | Run a full **Lighthouse** analysis (Performance, SEO, Accessibility, Best Practices). |
| `pagespeed_core_web_vitals` | Get Chrome UX Report (CrUX) data for Core Web Vitals (LCP, CLS, INP). |
| `schema_validate` | Validate **JSON-LD Structure Data** against Schema.org standards. |

## 🌐 Sites & Sitemaps
| Tool | Description |
| :--- | :--- |
| `sites_list` | List all verified properties. |
| `sites_add` / `sites_delete` | Add or remove properties. |
| `sitemaps_list` | List submitted sitemaps and their status. |
| `sitemaps_submit` / `sitemaps_delete` | Submit or remove sitemaps. |

## 🛠️ Utilities
| Tool | Description |
| :--- | :--- |
| `util_star_repo` | Support the project by starring it on GitHub! 🌟 |

## 📊 Google Analytics 4 (GA4)
| Tool | Description |
| :--- | :--- |
| `analytics_page_performance` | Detailed page metrics (sessions, engagement, views). |
| `analytics_traffic_sources` | Analyze sessions by Channel, Source, and Medium. |
| `analytics_organic_landing_pages` | Focused metrics for organic traffic landing pages. |
| `analytics_conversion_funnel` | Top converting pages and events. |
| `analytics_user_behavior` | Device, Country, and Engagement breakdown. |
| `analytics_audience_segments` | New vs Returning, Age, and OS analysis. |
| `analytics_realtime` | Live active user data by page and location. |
| `analytics_ecommerce` | Product and revenue performance. |
| `analytics_pagespeed_correlation` | Correlate GA4 metrics with PageSpeed scores. |

## 🔀 Cross-Platform Intelligence
| Tool | Description |
| :--- | :--- |
| `opportunity_matrix` | **[Flagship]** Prioritize SEO tasks by combining signals from GSC, GA4, and Bing. |
| `page_analysis` | Joint analysis of ranking (GSC) vs behavior (GA4) for pages. |
| `traffic_health_check` | Diagnose tracking gaps by comparing GSC clicks to GA4 organic sessions. |
| `brand_analysis` | Brand vs Non-Brand split across GSC, Bing, and GA4. |
| `compare_engines` | Compare keyword performance between Google and Bing. |
