# Jobs Aggregator Scraper

Aggregate public remote job listings from Remote OK, Remotive, and Arbeitnow into one clean, deduplicated dataset. Search by role, skill, company, location, and posting date, then export job titles, companies, locations, salary fields, source URLs, and attribution without supplying an API key.

## Quick start

Run a small search across all three supported sources:

```json
{
  "source": "all",
  "keywords": ["software"],
  "location": "",
  "remoteOnly": true,
  "dateFrom": "",
  "maxResults": 10,
  "maxPagesPerSource": 1,
  "includeDescription": false
}
```

Export results as JSON, CSV, Excel, XML, or HTML, or consume them through the Apify API, schedules, webhooks, Make, Zapier, n8n, and other integrations.

## What it extracts

- Job title and company name
- Location and remote-work flag
- Job type, category, and tags when available
- Salary text and numeric range when a source provides them
- Posted date
- Job and application URLs
- Source name, source job ID, and attribution
- Matching keyword and scraped timestamp
- Optional cleaned description text

## Supported sources

| Source | Coverage | Notes |
| --- | --- | --- |
| Remote OK | Remote roles worldwide | Salary and tags are available on some listings. |
| Remotive | Curated remote roles | Results retain Remotive URLs and attribution. |
| Arbeitnow | Remote and Europe-focused roles | Supports pagination and a remote-only filter. |

## Output dataset

The `Jobs` dataset view puts the fields used most often for spreadsheet analysis and workflow automation first.

### Verified output sample

This shortened record came from a successful public Actor run:

```json
{
  "source": "remoteok",
  "sourceJobId": "1133689",
  "title": "Analista de Software Sênior",
  "companyName": "Banco BV",
  "location": "São Paulo",
  "remote": true,
  "category": "dev",
  "tags": ["dev", "design", "docker", "java", "cloud"],
  "postedAt": "2026-06-19T00:00:13+00:00",
  "jobUrl": "https://remoteok.com/remote-jobs/remote-analista-de-software-senior-banco-bv-1133689",
  "applyUrl": "https://remoteok.com/remote-jobs/remote-analista-de-software-senior-banco-bv-1133689",
  "sourceAttribution": "Remote OK",
  "keywordUsed": "software",
  "scrapedAt": "2026-06-22T07:52:10.115Z"
}
```

Job listings change frequently. Titles, availability, salary details, and URLs reflect what each source exposed when the run completed.

## Input

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `source` | string | `all` | Search all sources or one of `remoteok`, `remotive`, or `arbeitnow`. |
| `keywords` | string[] | `["software"]` | One to ten job-title, skill, or company keywords. |
| `location` | string | empty | Optional case-insensitive location text filter. |
| `remoteOnly` | boolean | `true` | Keep only remote jobs where the source exposes that signal. |
| `dateFrom` | string | empty | Optional ISO date filter for the posting date. |
| `maxResults` | integer | `10` | Maximum number of clean, unique records to save. |
| `maxPagesPerSource` | integer | `1` | Page limit for paginated sources. |
| `includeDescription` | boolean | `false` | Include cleaned description text; this makes records larger. |

At least one non-empty keyword is required. Start with the defaults or set `maxResults` to `1` for the smallest paid sample.

## Common workflows

### Monitor selected roles

Run a focused keyword such as `data engineer`, `product manager`, or `cybersecurity`, then schedule the Actor and compare source IDs between runs.

### Research remote hiring

Aggregate several role or skill keywords and analyze company, location, category, salary, and posting-date patterns.

### Feed an internal workflow

Export the dataset to a spreadsheet or send it to a data warehouse, notification workflow, or internal recruiting-research tool.

## Pricing

This Actor uses Pay Per Event pricing.

| Event | Price |
| --- | ---: |
| Actor start | $0.00005 per GB of memory |
| Each successfully saved `job-scraped` item | $0.002 |

The default memory is 512 MB, which is billed as the one-event minimum, so the startup charge is approximately $0.00005. A default 10-job run is approximately $0.02005 before any applicable account-level charges.

Each clean job record is saved and charged atomically. Duplicate, filtered, failed, or empty records are not billed as `job-scraped` events, and result processing stops when the user's maximum-cost limit is reached.

## How it works

The Actor calls the selected public JSON APIs, normalizes their fields into one job schema, filters by keyword, location, remote status, and date, sorts recent listings first, deduplicates records, and writes the requested number of clean rows to the default dataset.

If one source is temporarily unavailable, the Actor returns records from the sources that succeeded. It fails only when every selected source fails.

## Limits and source terms

- Source APIs can change fields, availability, rate limits, or terms without notice.
- Salary, job type, category, tags, and description fields are source-dependent.
- A posting can be edited, filled, removed, or linked elsewhere after it is collected.
- Remotive requires its job URLs and source attribution to be retained and restricts republishing its feed on third-party job boards. Review its current API terms for your use case.
- Arbeitnow asks API users to avoid abusive traffic and appreciates source links.
- Optional description cleaning converts source HTML to plain text and may not preserve every layout detail.

## API example

```bash
curl -X POST "https://api.apify.com/v2/acts/fascinating_lentil~jobs-aggregator-scraper/runs?token=YOUR_APIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "all",
    "keywords": ["software"],
    "remoteOnly": true,
    "maxResults": 10,
    "maxPagesPerSource": 1,
    "includeDescription": false
  }'
```

## Responsible use

Use this Actor only for lawful collection of publicly available job information. You are responsible for complying with each source's terms, attribution requirements, robots rules, privacy laws, employment rules, and regulations that apply to your use case.

Do not use the output for spam, discriminatory profiling, unlawful automated employment decisions, or unauthorized republishing. This Actor is an independent tool and is not affiliated with, endorsed by, or sponsored by Remote OK, Remotive, or Arbeitnow.

## License

Apache-2.0.
