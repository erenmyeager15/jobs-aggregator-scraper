# Jobs Aggregator Scraper - Remote Job APIs

Jobs Aggregator Scraper collects job listings from no-key public job APIs and exports clean records for recruiting research, lead generation, labor-market analysis, and job-board enrichment. It currently supports Remote OK, Remotive, and Arbeitnow. Export to JSON, CSV, Excel, or HTML, or pull via the Apify API. No login or API key is required.

## What It Extracts

- Source and source job ID
- Job title and company name
- Location and remote flag
- Category and tags
- Optional job type and salary fields where the source provides them
- Posted date
- Job URL and apply URL
- Source attribution
- Matching keyword and scraped timestamp
- Optional cleaned description text

## Use Cases

- Build recruiting lead lists from companies actively hiring
- Monitor remote hiring trends by keyword, role, and category
- Enrich job-board or talent-market datasets with source links
- Track salary ranges where public APIs expose them
- Research remote-first companies and active hiring signals

## Pricing

| Event | Price | Per 1,000 jobs | Per 10,000 jobs |
| --- | ---: | ---: | ---: |
| `job-scraped` | $0.002 | $2.00 | $20.00 |

The actor charges only after a clean job record is saved to the dataset.

## Input

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `source` | string | `all` | Search all sources or one source: `remoteok`, `remotive`, `arbeitnow`. |
| `keywords` | string[] | `["developer"]` | Job title, skill, or company keywords. |
| `location` | string | empty | Optional text filter for location. |
| `remoteOnly` | boolean | `true` | Keep only remote jobs where the source exposes this signal. |
| `dateFrom` | string | empty | Optional ISO date filter for posted date. |
| `maxResults` | integer | `100` | Maximum clean records to save. |
| `maxPagesPerSource` | integer | `3` | Page limit for paginated sources. |
| `includeDescription` | boolean | `false` | Include cleaned job description text. |

## How to Scrape Jobs Aggregator Data (Step by Step)

1. Choose `all` or a specific source.
2. Enter one or more keywords such as `developer`, `data analyst`, or `product manager`.
3. Optionally set a location filter, date filter, or turn on descriptions.
4. Run the actor and wait for the dataset to fill.
5. Export results from the Dataset tab or consume them through the Apify API.

## Sample Output

```json
{
  "source": "remoteok",
  "sourceJobId": "1133163",
  "title": "Senior SDET",
  "companyName": "NDEAVOUR CONSULTING",
  "location": "Remote",
  "remote": true,
  "jobType": "Full-time",
  "category": "testing",
  "tags": ["testing", "java", "cloud", "typescript"],
  "salary": "90000 - 130000",
  "salaryMin": 90000,
  "salaryMax": 130000,
  "postedAt": "2026-06-10T16:00:53+00:00",
  "jobUrl": "https://remoteok.com/remote-jobs/remote-senior-sdet-ndeavour-consulting-1133163",
  "applyUrl": "https://remoteok.com/remote-jobs/remote-senior-sdet-ndeavour-consulting-1133163",
  "sourceAttribution": "Remote OK",
  "keywordUsed": "developer",
  "scrapedAt": "2026-06-12T00:00:00.000Z"
}
```

## How It Works

The actor calls public JSON APIs, normalizes each source into a shared job schema, filters by keyword, location, remote status, and date, deduplicates by source ID and title/company/location, then saves clean records to the Apify Dataset.

## Known Limits

- Source APIs can change fields, rate limits, or terms without notice.
- Remotive requires linking back to Remotive job URLs and source attribution, and should not be used to repost jobs to third-party job boards.
- Arbeitnow asks API users not to abuse the service and appreciates source links; its general site terms should be reviewed for your use case.
- Remote OK includes anti-spam application text inside some descriptions; keep `includeDescription` off if you only need lead fields.
- Job type and salary fields are source-dependent and omitted from records when unavailable.

## Responsible Use

This Actor is intended for lawful collection of publicly available information only. Users are responsible for ensuring their use complies with the source website's terms, robots.txt, applicable privacy laws, including India's DPDP Act, and all local regulations.

Do not use this Actor to collect, store, sell, or misuse personal data without a lawful basis. The Actor author is not responsible for misuse by end users.

## License

Apache-2.0
