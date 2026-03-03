# Analyze X Thread → Polis CSV Files for Agora

## What this is for

You are converting an X (Twitter) thread into a **Polis-format dataset** for import into Agora Citizen Network. Agora uses Polis clustering to find **opinion groups** — clusters of people who vote similarly on a set of statements.

**Your goal is NOT to summarize the thread.** Your goal is to find the **fault lines** — the topics where the community genuinely splits into 2-4 camps. A successful analysis produces visible clusters in Agora's analysis tab, where each cluster represents a coherent worldview.

This means:
- Statements that everyone agrees with are **useless** — they create no clustering signal
- Statements that only one person cares about are **useless** — too niche to cluster around
- The most valuable statements are ones where roughly 40-60% agree and 40-60% disagree
- Statements should cover **different dimensions** of disagreement, not 5 variations of the same point

---

## Input

Prefer the **filtered** file (`output/{tweetId}.filtered.json`) over the raw file — it keeps only high-engagement replies, cutting noise and reducing token cost while preserving signal. Fall back to `output/{tweetId}.json` if no filtered file exists.

The JSON contains:

- **`originalTweet`**: the root tweet that started the conversation
  - `text`, `authorId`, `authorUsername`, `likeCount`, `replyCount`, `retweetCount`, `quoteCount`
- **`replies`**: all tweets in the conversation tree (direct replies AND nested replies), each with:
  - `text` — the reply content
  - `authorId`, `authorUsername` — who wrote it
  - `likeCount`, `replyCount`, `retweetCount` — engagement metrics
  - `inReplyToTweetId` — which tweet this is replying to (use this to reconstruct the reply tree)
  - `_depth` — distance from the root tweet (0 = direct reply, 1 = reply-to-reply, etc.)
- **`quotes`** (optional): quote tweets of the original tweet — often where influential voices add substantial commentary. Each quote has:
  - Same fields as a reply (`text`, `authorId`, `authorUsername`, engagement metrics)
  - `quotedTweetId` — which tweet was quoted
  - `thread` (optional) — if the quote tweet was popular enough to explore, its own conversation tree:
    - `thread.replies` — replies to the quote tweet (same structure as top-level `replies`)
    - `thread.quotes` — sub-quote tweets (recursive, same structure)
- **`_authors`** (optional): a map from `authorId` to author profile data:
  - `username`, `bio`, `followerCount`, `followingCount`, `verifiedType`, `accountCreatedAt`
  - `repliesInThread` — how many replies this author posted in the thread
  - `totalLikesInThread` — sum of likes across all their replies
  - `replyIds` — ordered list of their reply IDs (read all together to profile the voter)
- **`_threadStats`** (optional): aggregate statistics about the thread:
  - `uniqueAuthors`, `totalReplies`, `directReplies`, `nestedReplies`
  - `maxDepth`, `averageDepth` — reply tree structure
  - `engagementDistribution` — { p25, p50, p75, p99 } of like counts across replies
  - `topAuthors` — top 10 authors by total likes
  - `authorsByReplyCount` — { single, twoToThree, fourPlus } how many authors posted 1, 2-3, or 4+ replies
  - `timeSpan` — { first, last, durationHours }
  - `quoteStats` — { totalQuotes, quotesWithThreads, totalQuoteReplies, uniqueQuoteAuthors, engagementDistribution? } — the optional `engagementDistribution` (p25/p50/p75/p99 of like counts) covers replies within explored quote threads, letting you calibrate engagement separately from the main thread
- **`_topReplyChains`** (optional): the 10 most substantive reply chains across both the main thread AND quote threads, pre-threaded and ranked by total engagement. Start here to find key fault lines before reading the full flat reply list
- **`tweetUrl`**: URL of the original tweet

---

## Step 1: Read and map the thread

Before extracting anything, read the ENTIRE thread to build a mental map:

1. **What is the main topic or controversy?** Summarize it in one sentence for yourself.
2. **What are the 2-4 main camps?** People in X threads tend to cluster around a few core positions. Identify them.
3. **Where are the fault lines?** Which sub-topics generate the most back-and-forth? These are your best candidates for statements.
4. **Which replies are substantive vs noise?** A thread with 7K replies will have a lot of "lol", memes, and off-topic noise. Mentally filter these out.
5. **Read quote tweets as a separate content layer.** Quote tweet authors are often influential voices whose framing reveals their stance. Their reply threads can bring in an entirely different audience and different fault lines.

Use the reply tree (`inReplyToTweetId` and `_depth`) to understand conversation flow. A chain of 10 back-and-forth replies between two people often reveals a key disagreement.

If `_topReplyChains` is present, start there — these are the highest-engagement back-and-forth conversations, pre-threaded for easy reading.

If `_threadStats` is present, use `engagementDistribution` to calibrate what "high" vs "low" engagement means for this specific thread. A reply with likes >= p75 is notably popular; one < p25 is low-signal.

If `_authors` is present, use it to profile voters holistically before assigning any votes (see Step 3).

---

## Step 2: Extract statements

Extract **15-25 statements** that capture the key disagreements in the thread.

### What makes a GOOD statement

- **Divisive**: roughly splits the thread — not unanimously agreed upon
- **Standalone**: readable without knowing the original tweet or who said it
- **Single idea**: captures one proposition, not two ("X is good AND Y is bad" → split into two)
- **Neutral wording**: third-person, no "I think" — e.g. "Open-source AI models are safer than closed ones"
- **Concise**: one sentence, ideally under 140 characters
- **Represents a camp**: multiple people in the thread hold this view, not just one person's niche take
- **Covers different angles**: don't write 5 statements about the same sub-topic; spread across the different fault lines you identified

### What makes a BAD statement

- **Unanimous**: everyone in the thread agrees → no clustering signal → useless
- **Factual**: objectively verifiable true/false claims (e.g. "The Earth orbits the Sun") are not opinions
- **Too vague**: "Things should be better" — no one would disagree, and it's meaningless
- **Too specific**: "The user @foo's second point about paragraph 3 of the blog post" — incomprehensible without context
- **Duplicate**: same idea as another statement, slightly reworded — merge them into one

### Strategy

1. **Start from `_topReplyChains`** if available — these are the highest-engagement back-and-forth conversations, pre-identified as the richest source of fault lines
2. **Check the highest-liked replies** (use `_threadStats.topAuthors` if available) — they represent positions that many silent readers share
3. **Mine quote tweets** — quote tweet authors often bring a different framing and audience. Check `quotes` and their `thread.replies` for additional fault lines
4. **Cover minority positions too** — don't only extract the top 2 popular positions. Include niche-but-coherent viewpoints (they'll form smaller but real clusters)
5. **Test each statement**: ask yourself "would this split the thread roughly in half, or at least into identifiable camps?" If everyone would agree or everyone would disagree, discard it

---

## Step 3: Identify voters and infer their votes

### Who is a voter?

Each unique **reply author** is a voter — this includes authors from both the main `replies` array AND from `quotes` (and their nested `thread.replies`). Likers and silent readers are not included.

If an author posted multiple replies, they are still ONE voter. Read all their replies together to understand their overall position.

If `_authors` is present, use it for efficient voter profiling: each entry lists all of an author's `replyIds`, so you can read their contributions in order without scanning the full reply list. Use `bio` to understand expertise or allegiance. Use `followerCount` as a rough confidence signal (influential voices represent more silent readers), but remember: follower count does NOT create additional votes — it only affects how confident you should be in your inference.

### How to infer votes

For each voter, determine their stance on each statement:
- **`1`** = agree
- **`-1`** = disagree
- **Omit entirely** = the voter's replies don't address this statement at all
- **`0`** = the voter explicitly expressed uncertainty or acknowledged both sides

#### Direct textual signals

| Signal | Meaning |
|--------|---------|
| "I agree", "This", "100%", "+1", "Facts", "Exactly" | Agrees with the position of the tweet they're replying to |
| "No", "Wrong", "That's not true", "I disagree", "Nah" | Disagrees with the position of the tweet they're replying to |
| Building a detailed argument FOR a position | Agrees with the corresponding statement |
| Building a detailed counter-argument | Disagrees with the corresponding statement |
| "I'm not sure", "it depends", "both sides have a point" | Pass (vote = 0) |

#### Reply tree reasoning (critical)

The `inReplyToTweetId` field lets you reconstruct who is responding to whom. Use this to infer stances transitively:

**Example chain:**
- Tweet A (by @alice): "AI regulation is necessary to prevent harm" → supports statement S1
- Tweet B (by @bob), replying to A: "That would kill innovation" → @bob disagrees with S1
- Tweet C (by @carol), replying to B: "Exactly, overregulation is the real danger" → @carol also disagrees with S1
- Tweet D (by @dave), replying to B: "Innovation means nothing if it causes harm" → @dave disagrees with @bob → @dave agrees with S1

**Rules for transitive inference:**
- If B pushes back on A, and A supports statement S → B likely disagrees with S
- If C agrees with B (who disagreed with A) → C also likely disagrees with S
- Trace up to 2-3 levels. Beyond that, confidence drops — omit rather than guess
- Always verify by reading the actual text, not just the reply chain position

#### Sarcasm and rhetorical devices

X is full of sarcasm. Watch for:
- "Oh sure, because THAT's worked so well" → actually DISAGREES
- "Can't wait for this to go wrong /s" → skeptical, DISAGREES
- ALL CAPS used for emphasis or mockery
- "..." ellipses indicating skepticism
- Rhetorical questions: "And who exactly is going to enforce that?" → likely disagrees with the premise

**When in doubt about sarcasm → omit the vote.** A wrong vote is worse than a missing one for clustering.

#### Multi-reply authors

If @user posted 5 replies across the thread:
1. Read ALL of them before assigning any votes
2. Build a coherent picture of their overall stance
3. If they contradict themselves across replies, go with the most emphatic or most recent position
4. Their different replies may address different statements — good, assign votes to each

#### Engagement as confidence signal

- A reply with 500 likes expressing a clear stance → **high confidence**, assign the vote
- A reply with 0 likes and ambiguous text → **low confidence**, consider omitting
- Like counts do NOT create voters — they're a quality/confidence signal only
- If `_threadStats.engagementDistribution` is available, use its percentiles to calibrate: likes >= p75 = high confidence, likes < p25 = low confidence for this specific thread

#### Quote tweet authors as voters

Quote tweet authors in the `quotes` array are also voters. The act of quoting is itself a strong signal — quote authors invested more effort than casual repliers:

- Quoting with positive framing ("This is exactly right", "Worth reading") → agrees with the quoted position
- Quoting to criticize ("This is dangerous misinformation", "Wrong on every level") → disagrees
- Quoting to add nuance without clearly agreeing or disagreeing → pass (vote = 0) or omit
- The quote author's reply thread (in `quotes[].thread.replies`) provides additional context for their stance
- If someone replies to a quote tweet agreeing with the quoter, they likely share the quoter's stance on the original topic

#### Strategies for improving vote matrix density

A sparse vote matrix (most voters have only 1-2 votes) produces weak clustering. Use these strategies to increase density without sacrificing accuracy:

- **Author profiling via `_authors`**: Read ALL replies by the same author (listed in `_authors[authorId].replyIds`) before assigning any votes. An author who posted 5 replies likely addressed 3-5 different topics. Reading them together reveals stances you might miss looking reply-by-reply.
- **Cross-topic inference**: If an author argues for position X and X logically implies Z, you can infer a vote on Z — but only when the implication is strong and obvious. Don't chain speculative inferences.
- **Reply-to-quote inference**: If someone replies to a quote tweet agreeing with the quoter, they likely share the quoter's stance on the original topic.
- **Target**: Aim for each voter to have votes on at least 5 statements. If most voters have fewer than 3, consider whether your statements are too narrow (only relevant to one sub-discussion) and should be broadened.

### Bot filtering

If `_authors` is available, use these heuristics to identify and skip bot accounts:
- No bio + suspicious follower/following ratio (e.g. 50K following, 3 followers)
- Account created very recently + generic username patterns
- Repetitive text patterns across replies
- When in doubt, include the voter — false negatives (missing a real voter) are worse than false positives for clustering

### Noise filtering — skip these entirely

Do NOT make these people voters:
- **Bot accounts**: promotional text, repetitive patterns, link spam, auto-generated content
- **Pure reactions**: "lmao", single emoji, "ratio", "W", "L" — no substantive content to infer from
- **Completely off-topic**: replies about something unrelated to the thread's topic
- **Self-promotion**: "Check out my take on this at [link]" with no actual opinion stated

If a reply is borderline (e.g. "This is so dumb" — expresses disagreement but vaguely), you CAN include it if the reply tree context makes the stance clear. Otherwise, skip.

---

## Step 4: Write the CSV files

Write 3 files to the `output/` directory, named with the tweet ID to avoid overwriting other analyses:

### `output/{tweetId}-summary.csv`

No header row. Key-value pairs, one per line:
```
topic,<title derived from the original tweet — keep under 140 chars>
url,<the tweetUrl field from raw.json>
voters,<total unique voters who got at least one vote assigned>
voters-in-conv,<same as voters>
commenters,<same as voters>
comments,<number of statements extracted>
groups,0
```

### `output/{tweetId}-comments.csv`

Header row, then one row per statement:
```
timestamp,datetime,comment-id,author-id,agrees,disagrees,moderated,comment-body
```

- `timestamp`: sequential Unix timestamp starting from 1000000000
- `datetime`: ISO format matching the timestamp (e.g. `2001-09-09T01:46:40Z`)
- `comment-id`: sequential integer starting from 0
- `author-id`: always 0 (statements are synthesized by the analysis, not authored by a specific user)
- `agrees`: count of voters who voted 1 on this statement
- `disagrees`: count of voters who voted -1 on this statement
- `moderated`: always 0
- `comment-body`: the statement text. **Always double-quote this field** to handle commas and special characters safely

### `output/{tweetId}-votes.csv`

Header row, then one row per voter-statement pair **where a vote was inferred**:
```
timestamp,datetime,comment-id,voter-id,vote
```

- `timestamp`: sequential Unix timestamps starting from 1000000001
- `datetime`: ISO format matching the timestamp
- `comment-id`: the statement's comment-id from comments.csv
- `voter-id`: sequential integer starting from 0, consistent across all of a voter's votes
- `vote`: `1` (agree), `-1` (disagree), or `0` (pass/unsure)

**Only include rows where you inferred a vote.** If a voter's replies don't address a statement, do NOT add a row for that pair.

---

## Quality checklist

Before finishing, verify:

- [ ] **Statements are diverse** — cover at least 3-4 different dimensions of disagreement, not all about the same sub-topic
- [ ] **Statements are divisive** — most statements should have both agrees AND disagrees, not be unanimously one-sided
- [ ] **Vote matrix isn't too sparse** — most voters should have votes on at least 3-5 statements (if not, your statements may not match the thread well)
- [ ] **CSV format is correct**:
  - `summary.csv` has NO header row
  - `comments.csv` and `votes.csv` HAVE header rows
  - `comment-body` is always double-quoted
  - Column counts are consistent across all rows
- [ ] **Counts are consistent**:
  - `agrees` + `disagrees` in comments.csv match the actual counts in votes.csv for each statement
  - `voters` in summary.csv matches the number of unique voter-ids in votes.csv
  - `comments` in summary.csv matches the number of data rows in comments.csv
- [ ] **No duplicates**: no voter has two votes on the same statement in votes.csv
- [ ] **Voter-ids are stable**: same voter-id for the same person across all their votes
- [ ] **Quote tweets considered**: if `quotes` exists, quote tweet authors and their reply threads have been included in both statement extraction and voter inference
- [ ] **Vote density**: most voters have votes on at least 3-5 statements; if not, consider broadening statement coverage
