import type {
    ActorInput,
    ArbeitnowJob,
    FetchContext,
    JobRecord,
    NormalizedSourceJob,
    RemoteOkJob,
    RemotiveJob,
} from './types.js';

const SOURCE_LABELS = {
    remoteok: 'Remote OK',
    remotive: 'Remotive',
    arbeitnow: 'Arbeitnow',
} as const;

export async function fetchJobsFromSources(input: ActorInput): Promise<JobRecord[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);

    try {
        const context: FetchContext = { input, signal: controller.signal };
        const selected = getSelectedSources(input.source);
        const sourceResults: NormalizedSourceJob[][] = [];

        for (const source of selected) {
            if (source === 'remoteok') sourceResults.push(await fetchRemoteOk(context));
            if (source === 'remotive') sourceResults.push(await fetchRemotive(context));
            if (source === 'arbeitnow') sourceResults.push(await fetchArbeitnow(context));
        }

        return dedupeAndLimit(sourceResults.flat(), input).map(({ rawSearchText: _rawSearchText, ...record }) => compactJobRecord({
            ...record,
            scrapedAt: new Date().toISOString(),
        }));
    } finally {
        clearTimeout(timeout);
    }
}

async function fetchRemoteOk({ input, signal }: FetchContext): Promise<NormalizedSourceJob[]> {
    const json = await fetchJson<unknown>('https://remoteok.com/api', signal);
    if (!Array.isArray(json)) return [];

    return json
        .filter((item): item is RemoteOkJob => Boolean(item && typeof item === 'object' && (item as RemoteOkJob).id))
        .map((job) => {
            const salaryMin = toNumber(job.salary_min);
            const salaryMax = toNumber(job.salary_max);
            const salary = salaryMin || salaryMax ? [salaryMin, salaryMax].filter(Boolean).join(' - ') : null;
            const postedAt = job.date ?? (job.epoch ? new Date(job.epoch * 1000).toISOString() : null);
            const title = cleanText(job.position) ?? '';
            const companyName = cleanText(job.company) ?? '';
            const location = cleanText(job.location);
            const tags = normalizeTags(job.tags);
            const descriptionText = input.includeDescription ? htmlToText(job.description) : undefined;
            const url = normalizeUrl(job.url, 'https://remoteok.com') ?? `https://remoteok.com/remote-jobs/${job.id}`;
            const applyUrl = normalizeUrl(job.apply_url, 'https://remoteok.com') ?? url;

            return {
                source: 'remoteok',
                sourceJobId: String(job.id),
                title,
                companyName,
                location,
                remote: true,
                jobType: inferJobType(tags),
                category: tags[0] ?? null,
                tags,
                salary,
                salaryMin,
                salaryMax,
                postedAt,
                jobUrl: url,
                applyUrl,
                sourceAttribution: SOURCE_LABELS.remoteok,
                keywordUsed: findMatchingKeyword(input.keywords, [title, companyName, location, tags.join(' '), descriptionText]),
                descriptionText,
                rawSearchText: buildSearchText([title, companyName, location, tags.join(' '), descriptionText]),
            } satisfies NormalizedSourceJob;
        })
        .filter((job) => isUsableJob(job) && matchesInput(job, input));
}

async function fetchRemotive({ input, signal }: FetchContext): Promise<NormalizedSourceJob[]> {
    const searches = input.keywords.length > 0 ? input.keywords : [''];
    const jobs: NormalizedSourceJob[] = [];
    const perSearchLimit = Math.max(10, Math.min(100, input.maxResults || 100));

    for (const keyword of searches) {
        const params = new URLSearchParams();
        params.set('limit', String(perSearchLimit));
        if (keyword) params.set('search', keyword);

        const json = await fetchJson<{ jobs?: RemotiveJob[] }>(`https://remotive.com/api/remote-jobs?${params}`, signal);
        const sourceJobs = Array.isArray(json.jobs) ? json.jobs : [];

        for (const job of sourceJobs) {
            const title = cleanText(job.title) ?? '';
            const companyName = cleanText(job.company_name) ?? '';
            const location = cleanText(job.candidate_required_location);
            const tags = normalizeTags(job.tags);
            const descriptionText = input.includeDescription ? htmlToText(job.description) : undefined;
            const url = normalizeUrl(job.url, 'https://remotive.com');

            if (!url) continue;

            jobs.push({
                source: 'remotive',
                sourceJobId: String(job.id ?? url),
                title,
                companyName,
                location,
                remote: true,
                jobType: normalizeJobType(job.job_type),
                category: cleanText(job.category),
                tags,
                salary: cleanText(job.salary),
                salaryMin: null,
                salaryMax: null,
                postedAt: normalizeDate(job.publication_date),
                jobUrl: url,
                applyUrl: url,
                sourceAttribution: SOURCE_LABELS.remotive,
                keywordUsed: keyword || findMatchingKeyword(input.keywords, [title, companyName, location, tags.join(' '), descriptionText]),
                descriptionText,
                rawSearchText: buildSearchText([title, companyName, location, tags.join(' '), descriptionText]),
            });
        }

        await delay(700);
    }

    return jobs.filter((job) => isUsableJob(job) && matchesInput(job, input));
}

async function fetchArbeitnow({ input, signal }: FetchContext): Promise<NormalizedSourceJob[]> {
    const jobs: NormalizedSourceJob[] = [];
    const maxPages = Math.max(1, Math.min(input.maxPagesPerSource, 20));

    for (let page = 1; page <= maxPages; page++) {
        const params = new URLSearchParams();
        params.set('page', String(page));
        if (input.remoteOnly) params.set('remote', 'true');

        const json = await fetchJson<{ data?: ArbeitnowJob[]; links?: { next?: string | null } }>(
            `https://www.arbeitnow.com/api/job-board-api?${params}`,
            signal,
        );
        const sourceJobs = Array.isArray(json.data) ? json.data : [];

        for (const job of sourceJobs) {
            const title = cleanText(job.title) ?? '';
            const companyName = cleanText(job.company_name) ?? '';
            const location = cleanText(job.location);
            const tags = normalizeTags(job.tags);
            const descriptionText = input.includeDescription ? htmlToText(job.description) : undefined;
            const url = normalizeUrl(job.url, 'https://www.arbeitnow.com');

            if (!url) continue;

            jobs.push({
                source: 'arbeitnow',
                sourceJobId: cleanText(job.slug) ?? url,
                title,
                companyName,
                location,
                remote: typeof job.remote === 'boolean' ? job.remote : null,
                jobType: normalizeJobType(job.job_types?.[0]),
                category: tags[0] ?? null,
                tags,
                salary: null,
                salaryMin: null,
                salaryMax: null,
                postedAt: job.created_at ? new Date(job.created_at * 1000).toISOString() : null,
                jobUrl: url,
                applyUrl: url,
                sourceAttribution: SOURCE_LABELS.arbeitnow,
                keywordUsed: findMatchingKeyword(input.keywords, [title, companyName, location, tags.join(' '), descriptionText]),
                descriptionText,
                rawSearchText: buildSearchText([title, companyName, location, tags.join(' '), descriptionText]),
            });
        }

        if (!json.links?.next) break;
        await delay(700);
    }

    return jobs.filter((job) => isUsableJob(job) && matchesInput(job, input));
}

function getSelectedSources(source: ActorInput['source']): Array<JobRecord['source']> {
    if (source === 'all') return ['remoteok', 'remotive', 'arbeitnow'];
    return [source];
}

function dedupeAndLimit(jobs: NormalizedSourceJob[], input: ActorInput): NormalizedSourceJob[] {
    const seen = new Set<string>();
    const output: NormalizedSourceJob[] = [];

    for (const job of jobs.sort(sortByDateDesc)) {
        const key = [
            normalizeKey(job.title),
            normalizeKey(job.companyName),
            normalizeKey(job.location ?? ''),
        ].join('|');
        const sourceKey = `${job.source}:${job.sourceJobId}`;
        const dedupeKey = key.length > 2 ? key : sourceKey;

        if (seen.has(sourceKey) || seen.has(dedupeKey)) continue;

        seen.add(sourceKey);
        seen.add(dedupeKey);
        output.push(job);

        if (input.maxResults > 0 && output.length >= input.maxResults) break;
    }

    return output;
}

function matchesInput(job: NormalizedSourceJob, input: ActorInput): boolean {
    if (input.remoteOnly && job.remote === false) return false;

    const hasKeywordFilter = input.keywords.some(Boolean);
    if (hasKeywordFilter && !findMatchingKeyword(input.keywords, [job.rawSearchText])) return false;

    const location = cleanText(input.location);
    if (location && !job.rawSearchText.toLowerCase().includes(location.toLowerCase())) return false;

    if (input.dateFrom) {
        const minDate = Date.parse(input.dateFrom);
        const posted = job.postedAt ? Date.parse(job.postedAt) : Number.NaN;
        if (Number.isFinite(minDate) && (!Number.isFinite(posted) || posted < minDate)) return false;
    }

    return true;
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
    const response = await fetch(url, {
        signal,
        headers: {
            accept: 'application/json',
            'user-agent': 'Apify Jobs Aggregator Scraper (https://apify.com)',
        },
    });

    if (!response.ok) {
        throw new Error(`Request failed ${response.status} ${response.statusText}: ${url}`);
    }

    return await response.json() as T;
}

function isUsableJob(job: NormalizedSourceJob): boolean {
    return Boolean(job.sourceJobId && job.title && job.companyName && job.jobUrl);
}

function compactJobRecord(record: JobRecord): JobRecord {
    const compact: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
        if (value === null || value === undefined) continue;
        if (Array.isArray(value) && value.length === 0) continue;
        if (typeof value === 'string' && value.trim() === '') continue;
        compact[key] = value;
    }

    return compact as unknown as JobRecord;
}

function sortByDateDesc(a: NormalizedSourceJob, b: NormalizedSourceJob): number {
    const aTime = a.postedAt ? Date.parse(a.postedAt) : 0;
    const bTime = b.postedAt ? Date.parse(b.postedAt) : 0;
    return bTime - aTime;
}

function findMatchingKeyword(keywords: string[], values: Array<string | null | undefined>): string | null {
    const text = buildSearchText(values).toLowerCase();
    return keywords.find((keyword) => keyword && text.includes(keyword.toLowerCase())) ?? null;
}

function buildSearchText(values: Array<string | null | undefined>): string {
    return values.filter(Boolean).join(' ');
}

function normalizeTags(tags: unknown): string[] {
    if (!Array.isArray(tags)) return [];
    return tags
        .map((tag) => cleanText(String(tag)))
        .filter((tag): tag is string => Boolean(tag))
        .filter((tag, index, all) => all.indexOf(tag) === index)
        .slice(0, 25);
}

function inferJobType(tags: string[]): string | null {
    const joined = tags.join(' ').toLowerCase();
    if (joined.includes('full time') || joined.includes('full-time')) return 'Full-time';
    if (joined.includes('part time') || joined.includes('part-time')) return 'Part-time';
    if (joined.includes('contract')) return 'Contract';
    if (joined.includes('freelance')) return 'Freelance';
    if (joined.includes('intern')) return 'Internship';
    return null;
}

function normalizeJobType(value: string | null | undefined): string | null {
    const cleaned = cleanText(value?.replace(/[_-]/g, ' ') ?? null);
    if (!cleaned) return null;
    return cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeDate(value: string | null | undefined): string | null {
    const timestamp = value ? Date.parse(value) : Number.NaN;
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function normalizeUrl(value: string | null | undefined, base: string): string | null {
    if (!value) return null;
    try {
        const url = new URL(value, base);
        url.hash = '';
        return url.toString();
    } catch {
        return null;
    }
}

function htmlToText(value: string | null | undefined): string | undefined {
    const cleaned = cleanText(
        String(value ?? '')
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
            .replace(/<[^>]+>/g, ' '),
    );
    return cleaned ?? undefined;
}

function cleanText(value: string | null | undefined): string | null {
    if (!value) return null;
    const decoded = decodeEntities(repairMojibake(value));
    const cleaned = decoded.replace(/\s+/g, ' ').trim();
    return cleaned || null;
}

function decodeEntities(value: string): string {
    return value
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x2F;/g, '/');
}

function repairMojibake(value: string): string {
    if (!/[\u00c2\u00c3\u00e2]/.test(value)) return value;

    try {
        const repaired = Buffer.from(value, 'latin1').toString('utf8');
        return mojibakeScore(repaired) < mojibakeScore(value) ? repaired : value;
    } catch {
        return value;
    }
}

function mojibakeScore(value: string): number {
    return (value.match(/[\u00c2\u00c3\u00e2]/g) ?? []).length;
}

function normalizeKey(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function toNumber(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
