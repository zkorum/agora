export interface GitHubIssue {
    number: number;
    title: string;
    body: string | null;
    state: "open" | "closed";
    stateReason: string | null;
    htmlUrl: string;
    labels: string[];
    assignees: string[];
    milestone: string | null;
}

export interface GitHubClient {
    listIssues: (params: {
        repo: string;
        label: string;
    }) => Promise<GitHubIssue[]>;
}

export interface SyncResult {
    created: number;
    updated: number;
}
