import { Actor } from 'apify';
import { fetchJobsFromSources } from './routes.js';
import type { ActorInput, JobRecord, SourceName } from './types.js';

const DEFAULT_INPUT: ActorInput = {
    source: 'all',
    keywords: ['software'],
    location: '',
    remoteOnly: true,
    dateFrom: '',
    maxResults: 10,
    maxPagesPerSource: 1,
    includeDescription: false,
};

await Actor.init();

try {
    const rawInput = (await Actor.getInput<Partial<ActorInput>>()) ?? {};
    const input = normalizeInput(rawInput);

    console.log('Jobs Aggregator Scraper started', {
        source: input.source,
        keywords: input.keywords,
        location: input.location,
        remoteOnly: input.remoteOnly,
        maxResults: input.maxResults,
    });

    const records = await fetchJobsFromSources(input);
    console.log(`Prepared ${records.length} clean job record(s).`);

    let pushed = 0;
    let spendingLimitReached = false;
    for (const record of records) {
        if (spendingLimitReached) break;
        if (!isChargeableJob(record)) continue;

        const chargeResult = await Actor.pushData(record, 'job-scraped');
        const recordWasSaved = chargeResult.chargedCount > 0 || !chargeResult.eventChargeLimitReached;
        if (recordWasSaved) pushed++;

        if (chargeResult.eventChargeLimitReached) {
            spendingLimitReached = true;
            const message = `Stopped at the user's spending limit after ${pushed} job(s).`;
            await Actor.setStatusMessage(message);
            console.warn(message);
        }
    }

    if (!spendingLimitReached) {
        await Actor.setStatusMessage(`Finished with ${pushed} unique job record(s).`);
        console.log(`Finished. Saved ${pushed} job record(s).`);
    }
} finally {
    await Actor.exit();
}

function normalizeInput(rawInput: Partial<ActorInput>): ActorInput {
    const source = isSourceName(rawInput.source) ? rawInput.source : DEFAULT_INPUT.source;
    const keywords = normalizeStringList(rawInput.keywords, DEFAULT_INPUT.keywords);

    return {
        source,
        keywords,
        location: String(rawInput.location ?? DEFAULT_INPUT.location).trim(),
        remoteOnly: typeof rawInput.remoteOnly === 'boolean' ? rawInput.remoteOnly : DEFAULT_INPUT.remoteOnly,
        dateFrom: normalizeDateInput(rawInput.dateFrom),
        maxResults: normalizeInteger(rawInput.maxResults, DEFAULT_INPUT.maxResults, 1, 1000),
        maxPagesPerSource: normalizeInteger(rawInput.maxPagesPerSource, DEFAULT_INPUT.maxPagesPerSource, 1, 20),
        includeDescription: typeof rawInput.includeDescription === 'boolean'
            ? rawInput.includeDescription
            : DEFAULT_INPUT.includeDescription,
    };
}

function normalizeStringList(value: string[] | undefined, fallback: string[]): string[] {
    const source = Array.isArray(value) ? value : fallback;
    const normalized = source
        .map((item) => String(item ?? '').trim())
        .filter(Boolean)
        .filter((item, index, all) => all.indexOf(item) === index)
        .slice(0, 10);

    return normalized.length > 0 ? normalized : fallback;
}

function normalizeInteger(value: number | undefined, fallback: number, min: number, max: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function normalizeDateInput(value: string | undefined): string {
    if (!value) return '';
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : '';
}

function isSourceName(value: unknown): value is SourceName {
    return ['all', 'remoteok', 'remotive', 'arbeitnow'].includes(String(value));
}

function isChargeableJob(record: JobRecord): boolean {
    return Boolean(record.source && record.sourceJobId && record.title && record.companyName && record.jobUrl);
}
