import { TimelineV2Paginator, TwitterV2Paginator } from './v2.paginator';
/** A generic PreviousableTwitterPaginator able to consume TweetV2 timelines with since_id, until_id and next_token (when available). */
class TweetTimelineV2Paginator extends TwitterV2Paginator {
    refreshInstanceFromResult(response, isNextPage) {
        var _a;
        const result = response.data;
        const resultData = (_a = result.data) !== null && _a !== void 0 ? _a : [];
        this._rateLimit = response.rateLimit;
        if (!this._realData.data) {
            this._realData.data = [];
        }
        if (isNextPage) {
            this._realData.meta.oldest_id = result.meta.oldest_id;
            this._realData.meta.result_count += result.meta.result_count;
            this._realData.meta.next_token = result.meta.next_token;
            this._realData.data.push(...resultData);
        }
        else {
            this._realData.meta.newest_id = result.meta.newest_id;
            this._realData.meta.result_count += result.meta.result_count;
            this._realData.data.unshift(...resultData);
        }
        this.updateIncludes(result);
    }
    getNextQueryParams(maxResults) {
        this.assertUsable();
        const params = { ...this.injectQueryParams(maxResults) };
        if (this._realData.meta.next_token) {
            params.next_token = this._realData.meta.next_token;
        }
        else {
            if (params.start_time) {
                // until_id and start_time are forbidden together for some reason, so convert start_time to a since_id.
                params.since_id = this.dateStringToSnowflakeId(params.start_time);
                delete params.start_time;
            }
            if (params.end_time) {
                // until_id overrides end_time, so delete it
                delete params.end_time;
            }
            params.until_id = this._realData.meta.oldest_id;
        }
        return params;
    }
    getPreviousQueryParams(maxResults) {
        this.assertUsable();
        return {
            ...this.injectQueryParams(maxResults),
            since_id: this._realData.meta.newest_id,
        };
    }
    getPageLengthFromRequest(result) {
        var _a, _b;
        return (_b = (_a = result.data.data) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
    }
    isFetchLastOver(result) {
        var _a;
        return !((_a = result.data.data) === null || _a === void 0 ? void 0 : _a.length) || !this.canFetchNextPage(result.data);
    }
    canFetchNextPage(result) {
        return !!result.meta.next_token;
    }
    getItemArray() {
        return this.tweets;
    }
    dateStringToSnowflakeId(dateStr) {
        const TWITTER_START_EPOCH = BigInt('1288834974657');
        const date = new Date(dateStr);
        if (isNaN(date.valueOf())) {
            throw new Error('Unable to convert start_time/end_time to a valid date. A ISO 8601 DateTime is excepted, please check your input.');
        }
        const dateTimestamp = BigInt(date.valueOf());
        return ((dateTimestamp - TWITTER_START_EPOCH) << BigInt('22')).toString();
    }
    /**
     * Tweets returned by paginator.
     */
    get tweets() {
        var _a;
        return (_a = this._realData.data) !== null && _a !== void 0 ? _a : [];
    }
    get meta() {
        return super.meta;
    }
}
/** A generic PreviousableTwitterPaginator able to consume TweetV2 timelines with pagination_tokens. */
class TweetPaginableTimelineV2Paginator extends TimelineV2Paginator {
    refreshInstanceFromResult(response, isNextPage) {
        super.refreshInstanceFromResult(response, isNextPage);
        const result = response.data;
        if (isNextPage) {
            this._realData.meta.oldest_id = result.meta.oldest_id;
        }
        else {
            this._realData.meta.newest_id = result.meta.newest_id;
        }
    }
    getItemArray() {
        return this.tweets;
    }
    /**
     * Tweets returned by paginator.
     */
    get tweets() {
        var _a;
        return (_a = this._realData.data) !== null && _a !== void 0 ? _a : [];
    }
    get meta() {
        return super.meta;
    }
}
// ----------------
// - Tweet search -
// ----------------
export class TweetSearchRecentV2Paginator extends TweetTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'tweets/search/recent';
    }
}
export class TweetSearchAllV2Paginator extends TweetTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'tweets/search/all';
    }
}
export class QuotedTweetsTimelineV2Paginator extends TweetPaginableTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'tweets/:id/quote_tweets';
    }
}
// -----------------
// - Home timeline -
// -----------------
export class TweetHomeTimelineV2Paginator extends TweetPaginableTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'users/:id/timelines/reverse_chronological';
    }
}
export class TweetUserTimelineV2Paginator extends TweetPaginableTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'users/:id/tweets';
    }
}
export class TweetUserMentionTimelineV2Paginator extends TweetPaginableTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'users/:id/mentions';
    }
}
// -------------
// - Bookmarks -
// -------------
export class TweetBookmarksTimelineV2Paginator extends TweetPaginableTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'users/:id/bookmarks';
    }
}
// ---------------------------------------------------------------------------------
// - Tweet lists (consume tweets with pagination tokens instead of since/until id) -
// ---------------------------------------------------------------------------------
/** A generic TwitterPaginator able to consume TweetV2 timelines. */
class TweetListV2Paginator extends TimelineV2Paginator {
    /**
     * Tweets returned by paginator.
     */
    get tweets() {
        var _a;
        return (_a = this._realData.data) !== null && _a !== void 0 ? _a : [];
    }
    get meta() {
        return super.meta;
    }
    getItemArray() {
        return this.tweets;
    }
}
export class TweetV2UserLikedTweetsPaginator extends TweetListV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'users/:id/liked_tweets';
    }
}
export class TweetV2ListTweetsPaginator extends TweetListV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'lists/:id/tweets';
    }
}
