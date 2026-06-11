export type SourceName = 'all' | 'remoteok' | 'remotive' | 'arbeitnow';

export interface ActorInput {
    source: SourceName;
    keywords: string[];
    location: string;
    remoteOnly: boolean;
    dateFrom: string;
    maxResults: number;
    maxPagesPerSource: number;
    includeDescription: boolean;
}

export interface JobRecord {
    source: 'remoteok' | 'remotive' | 'arbeitnow';
    sourceJobId: string;
    title: string;
    companyName: string;
    location: string | null;
    remote: boolean | null;
    jobType: string | null;
    category: string | null;
    tags: string[];
    salary: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    postedAt: string | null;
    jobUrl: string;
    applyUrl: string | null;
    sourceAttribution: string;
    keywordUsed: string | null;
    scrapedAt: string;
    descriptionText?: string;
}

export interface NormalizedSourceJob extends Omit<JobRecord, 'scrapedAt'> {
    rawSearchText: string;
}

export interface FetchContext {
    input: ActorInput;
    signal: AbortSignal;
}

export interface RemoteOkJob {
    id?: string | number;
    slug?: string;
    date?: string;
    epoch?: number;
    company?: string;
    company_logo?: string;
    position?: string;
    tags?: string[];
    description?: string;
    location?: string;
    apply_url?: string;
    salary_min?: number;
    salary_max?: number;
    url?: string;
}

export interface RemotiveJob {
    id?: string | number;
    url?: string;
    title?: string;
    company_name?: string;
    company_logo?: string;
    category?: string;
    tags?: string[];
    job_type?: string;
    publication_date?: string;
    candidate_required_location?: string;
    salary?: string;
    description?: string;
}

export interface ArbeitnowJob {
    slug?: string;
    company_name?: string;
    title?: string;
    description?: string;
    remote?: boolean;
    url?: string;
    tags?: string[];
    job_types?: string[];
    location?: string;
    created_at?: number;
}
