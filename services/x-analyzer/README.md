# x-analyzer

Fetch a tweet's replies, quote tweets, and metadata from the X API v2 for analysis. Optionally uses Grok (xAI) for scout intelligence, bot detection, and context enrichment.

## Setup

```bash
cp env.example .env
# Fill in X_BEARER_TOKEN (required) and XAI_API_KEY (optional)
pnpm install
```

## Usage

```bash
# Basic — smart budget, replies + quotes, breadth-first
pnpm x-fetch https://x.com/user/status/123456789

# Custom budget cap
pnpm x-fetch https://x.com/user/status/123456789 --max-cost 10

# Replies only, no quotes
pnpm x-fetch https://x.com/user/status/123456789 --no-quotes

# Deep quote exploration (quotes of quotes)
pnpm x-fetch https://x.com/user/status/123456789 --max-quote-depth 2

# Resume an interrupted fetch
pnpm x-fetch --resume
pnpm x-fetch --resume https://x.com/user/status/123456789

# No budget cap (dangerous for viral tweets)
pnpm x-fetch https://x.com/user/status/123456789 --no-limit
```

### CLI Options

| Option | Default | Description |
|---|---|---|
| `--max-tweets N` | unlimited | Stop after fetching N replies |
| `--max-cost N` | auto | Stop when estimated cost exceeds $N |
| `--no-quotes` | | Skip quote tweet exploration |
| `--max-quote-depth N` | 1 | How deep to follow quote threads (0 = flat list, 1 = replies of quotes) |
| `--auto-pct N` | 10 | Sensitivity for engagement auto-threshold (higher = more selective) |
| `--max-depth N` | 5 | Max sub-thread depth for engagement filtering |
| `--sort-order X` | relevancy | `relevancy` or `recency` |
| `--no-quality-stop` | | Disable auto-stop when page quality drops |
| `--no-limit` | | Skip auto-budget, fetch everything |
| `--resume` | | Resume an interrupted or incomplete fetch |

## Cost Model

The X API v2 charges per read:

- **$0.005** per tweet read
- **$0.010** per user read

### Smart Budget

For small threads (estimated total cost <= $3), no cap is applied. For larger threads, the tool auto-calculates a sqrt-scaled budget ($3-$25) based on reply/quote counts. Use `--max-cost` to override.

When the analyzed tweet quotes another tweet, the quoted thread is analyzed using the **remaining budget** from the parent analysis (not an independent budget). If the budget is exhausted, the quoted tweet ID is saved and can be fetched later with `--resume`.

## Pipeline

The analysis runs in 10 steps:

1. **Fetch original tweet** — Get the root tweet metadata and detect if it quotes another tweet
2. **Scout** (Grok, optional) — x_search intelligence: topic, camps, fault lines, priority authors/replies/quotes, suggested budget
3. **First page of replies** — Fetch page 1 to calibrate engagement thresholds
4. **Quote exploration** — Breadth-first traversal of quote tweets and their reply trees
5. **Remaining reply pages** — Paginate through all replies (budget-aware)
6. **Enrich** — Compute thread stats, author profiles, top reply chains
7. **Bot detection** (Grok, optional) — Flag suspicious accounts based on bio, follower ratios, reply patterns
8. **Engagement filtering** — Apply auto-calibrated thresholds, preserve priority authors/replies, exclude bots
9. **Grok enrichment** (optional) — Related threads, participant context, semantic highlights, salvaged filtered replies
10. **Quoted tweet analysis** — If the original tweet is a quote tweet, recursively analyze the quoted thread (depth-1 cap, shared budget)

Each step saves progress to disk. If the process crashes at any point, `--resume` picks up where it left off.

### Resume

Resume detects incomplete state and continues from the last successful step:

- **Incomplete replies** — `_nextToken` is set, continues paginating
- **Incomplete quotes** — Quote tree not fully explored, continues exploration
- **Missing bot detection** — `XAI_API_KEY` is set but `_botDetection` absent
- **Missing Grok enrichment** — `XAI_API_KEY` is set but `_grokContext` absent
- **Missing quoted thread** — `_quotedTweetId` is set but `_quotedThread` absent

## Output

Output is saved to the `output/` directory (gitignored). Each analysis produces 1 or 2 files:

```
output/
  {tweetId}.json              # Full raw data (always created)
  {tweetId}.filtered.json     # Engagement-filtered subset (only when thresholds apply)
```

The `.filtered.json` is only created when there's something to filter. For small threads where all replies fit in one page, the engagement thresholds don't kick in and every reply is kept — so only the `.json` file is produced. The filtered file appears for larger/viral threads where auto-calibrated thresholds exclude low-engagement replies, or when Grok flags bot accounts.

### `{tweetId}.json` — Full Data

```
{tweetId}.json
├── originalTweet                    # Root tweet
│   ├── id, text, authorId, authorUsername
│   ├── createdAt
│   ├── likeCount, replyCount, retweetCount, quoteCount
│
├── replies[]                        # All fetched replies (full tree)
│   ├── (same fields as originalTweet)
│   ├── inReplyToTweetId             # Parent tweet ID (null for orphans)
│   └── _depth?                      # Computed depth in the reply tree
│
├── quotes[]                         # Quote tweet threads (recursive)
│   ├── (same fields as originalTweet)
│   ├── quotedTweetId                # ID of the tweet being quoted
│   └── thread?                      # Explored thread (if engagement warranted)
│       ├── replies[]
│       └── quotes[]                 # Nested quotes (up to maxQuoteDepth)
│
├── fetchedAt                        # ISO timestamp
├── tweetUrl                         # Original URL
│
├── _nextToken?                      # Pagination cursor (present if fetch interrupted)
│
├── _fetchStats?                     # Fetch metadata
│   ├── totalFetchedReplies, totalFilteredReplies
│   ├── estimatedCost
│   ├── stoppedEarly, stopReason     # "complete" | "max-tweets" | "max-cost" | "quality-drop" | "priority-cap"
│   └── resolvedMinLikes?, resolvedMinReplies?  # Thresholds used for filtering
│
├── _threadStats?                    # Computed thread analytics
│   ├── uniqueAuthors, totalReplies, directReplies, nestedReplies
│   ├── maxDepth, averageDepth
│   ├── engagementDistribution       # { p25, p50, p75, p99 }
│   ├── topAuthors[]                 # { username, authorId, replyCount, totalLikes }
│   ├── authorsByReplyCount          # { single, twoToThree, fourPlus }
│   ├── timeSpan                     # { first, last, durationHours }
│   └── quoteStats?                  # { totalQuotes, quotesWithThreads, totalQuoteReplies, ... }
│
├── _authors?                        # Author metadata (keyed by user ID)
│   └── {authorId}
│       ├── username, bio?, followerCount?, followingCount?
│       ├── tweetCount?, verifiedType?, accountCreatedAt?
│       ├── repliesInThread, totalLikesInThread, replyIds[]
│
├── _topReplyChains?                 # Highest-engagement reply chains
│   └── []
│       ├── rootReplyId, totalEngagement, depth
│       └── messages[]               # { replyId, authorUsername, text, likeCount, depth }
│
├── _scout?                          # Grok x_search intelligence (when XAI_API_KEY set)
│   ├── topic, qualityScore (0-10)
│   ├── camps[]                      # Identified viewpoint clusters
│   ├── faultLines[]                 # Key dividing lines in the discussion
│   ├── estimatedBotPrevalence (0-1)
│   ├── priorityAuthors[], priorityReplyIds[], priorityQuoteTweetIds[]
│   └── suggestedBudget, suggestedAutoPct
│
├── _botDetection?                   # Bot detection results (when XAI_API_KEY set)
│   ├── assessments[]                # { authorId, username, isBot, confidence, reasoning }
│   ├── botAuthorIds[]
│   └── totalAssessed, totalFlagged
│
├── _grokContext?                    # Grok enrichment (when XAI_API_KEY set)
│   ├── relatedThreads[]             # { url, summary, relevance }
│   ├── participantContext[]          # { username, contextSummary }
│   ├── visualContentInsights[]       # { replyId, description, inferredStance? }
│   ├── semanticHighlights[]          # { replyId, reason }
│   └── salvaged[]                    # { replyId, reason } — filtered replies worth keeping
│
├── _quotedTweetId?                  # ID of quoted tweet (persisted for resume)
└── _quotedThread?                   # Full analysis of the quoted tweet (same structure, depth-1 cap)
```

Fields prefixed with `_` are internal metadata. Everything else is tweet/reply content.

### `{tweetId}.filtered.json` — Filtered Data

Same structure as the full data file, but `replies` and quote thread replies are filtered to only keep tweets meeting engagement thresholds. The raw file always keeps everything.

Filtering logic:
- **Engagement threshold** — Auto-calibrated from page 1 data (sqrt-based formula). Replies below the threshold are excluded.
- **Priority preservation** — Replies from Grok-identified priority authors and specific priority reply IDs bypass the engagement threshold.
- **Bot exclusion** — Replies from Grok-flagged bot accounts are always excluded (even if they meet engagement thresholds).
- **Ancestor preservation** — If a deep reply is kept, its entire ancestor chain back to the root is preserved for context.

## Retweet Handling

Pure retweets (`referenced_tweets` containing `type: "retweeted"`) are filtered out during fetch because they are duplicates of the original tweet's content. Tweets with no `referenced_tweets` (organic replies) or with only `type: "quoted"` references are always kept.

## CSV Export (`to-csv`)

Converts x-analyzer JSON output into 3 Polis-compatible CSV files for Agora import.

```bash
pnpm to-csv <tweet-id>       # Convert specific tweet
pnpm to-csv                   # Convert most recent JSON
```

### Two modes

**Enriched mode** (when `output/{tweetId}-analysis.json` exists):
Uses manually curated statements, opinion groups, and semantically inferred votes.
Produces a rich vote matrix with agrees, disagrees, and passes.

**Simple mode** (fallback):
Each direct reply becomes a statement. Only self-agree votes are generated.

### Creating an analysis file

The analysis file is produced by a human or Claude manually analyzing the thread data. This is a semantic curation step — NOT an automated process.

**Workflow:**
1. Run `pnpm x-fetch <tweet-url>` to fetch the thread data
2. Analyze the output JSON and create `output/{tweetId}-analysis.json`
3. Run `pnpm to-csv <tweet-id>` to generate CSVs from the analysis

**Analysis file format** (`{tweetId}-analysis.json`):

```json
{
    "tweetId": "123456789",
    "topic": "Short summary of the thread topic (1-140 chars)",
    "statements": [
        { "id": 0, "originalReplyId": "reply_tweet_id", "authorId": "author_twitter_id", "text": "Clean Polis statement" }
    ],
    "groups": [
        { "id": 0, "label": "Group name", "authorIds": ["author_id_1", "author_id_2"] }
    ],
    "groupVotes": [
        { "groupId": 0, "statementId": 0, "vote": "agree" }
    ]
}
```

**How to do the analysis (instructions for Claude or a human):**

1. **Read all direct replies** from the JSON output. Identify the original tweet's thesis and the scout data (camps, fault lines) if available.

2. **Extract quality statements** — Filter out noise (spam, bots, memes, images-only, low-effort, off-topic). For each substantive reply, extract a clean Polis statement following these rules:
   - ONE specific idea per statement
   - Easy to agree or disagree with
   - Under 280 characters (ideally under 140)
   - Clear and immediately understandable
   - Do NOT combine multiple ideas — split "A and B" into separate statements
   - Remove @mentions, hashtags, URLs from the text
   - Rewrite as a clear proposition if the original is messy
   - Preserve the original meaning faithfully

3. **Group authors into opinion clusters** — Based on what each author said, classify them into groups. Use the scout's camps and fault lines as guidance. Rules:
   - Each author belongs to exactly one group
   - Groups reflect genuine opinion alignment, not engagement level
   - Minimum 2 substantive groups
   - Exclude spam/bot/noise authors entirely (don't put them in any group)
   - Authors who made direct replies but whose replies were too noisy for statements can still be voters in a group if their position is clear

4. **Infer group votes** — For each (group, statement) pair, determine how members of that group would vote:
   - `"agree"`: This group clearly supports this statement's position
   - `"disagree"`: This group clearly opposes this statement's position
   - `"pass"`: The statement is irrelevant to this group, or no clear position

5. **Author override**: Each statement's author always votes `agree` on their own statement, regardless of group vote. This is handled automatically by `to-csv.ts`.

### Output CSV format

**Summary CSV** (`{tweetId}-summary.csv`): Key-value pairs, no headers.
```
topic,<string 1-140 chars>
url,<valid URL or empty>
voters,<int>
voters-in-conv,<int>
commenters,<int>
comments,<int>
groups,<int>
conversation-description,<string>
```

**Comments CSV** (`{tweetId}-comments.csv`): One row per statement.
```
timestamp,datetime,comment-id,author-id,agrees,disagrees,moderated,comment-body
```

**Votes CSV** (`{tweetId}-votes.csv`): One row per (voter, statement) pair.
```
timestamp,datetime,comment-id,voter-id,vote
```
Vote values: `1` (agree), `-1` (disagree), `0` (pass).

## Development

```bash
pnpm test          # Run tests (vitest)
pnpm lint          # Lint (eslint)
```

### Source Files

| File | Description |
|---|---|
| `src/fetch.ts` | Main CLI, X API v2 client, pagination, filtering, resume logic |
| `src/grok.ts` | Grok (xAI) client: scout, bot detection, enrichment phases |
| `src/to-csv.ts` | CSV export: converts JSON + analysis file into Polis-compatible CSVs |
| `src/fetch.test.ts` | Tests for fetch logic (MSW-mocked X API) |
| `src/grok.test.ts` | Tests for Grok client |
| `src/test-setup.ts` | Vitest setup (MSW server lifecycle) |
