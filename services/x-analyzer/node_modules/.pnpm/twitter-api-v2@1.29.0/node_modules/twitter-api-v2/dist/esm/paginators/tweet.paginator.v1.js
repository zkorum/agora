import TwitterPaginator from './TwitterPaginator';
/** A generic TwitterPaginator able to consume TweetV1 timelines. */
class TweetTimelineV1Paginator extends TwitterPaginator {
    constructor() {
        super(...arguments);
        this.hasFinishedFetch = false;
    }
    refreshInstanceFromResult(response, isNextPage) {
        const result = response.data;
        this._rateLimit = response.rateLimit;
        if (isNextPage) {
            this._realData.push(...result);
            // HINT: This is an approximation, as "end" of pagination cannot be safely determined without cursors.
            this.hasFinishedFetch = result.length === 0;
        }
    }
    getNextQueryParams(maxResults) {
        const latestId = BigInt(this._realData[this._realData.length - 1].id_str);
        return {
            ...this.injectQueryParams(maxResults),
            max_id: (latestId - BigInt(1)).toString(),
        };
    }
    getPageLengthFromRequest(result) {
        return result.data.length;
    }
    isFetchLastOver(result) {
        return !result.data.length;
    }
    canFetchNextPage(result) {
        return result.length > 0;
    }
    getItemArray() {
        return this.tweets;
    }
    /**
     * Tweets returned by paginator.
     */
    get tweets() {
        return this._realData;
    }
    get done() {
        return super.done || this.hasFinishedFetch;
    }
}
// Timelines
// Home
export class HomeTimelineV1Paginator extends TweetTimelineV1Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'statuses/home_timeline.json';
    }
}
// Mention
export class MentionTimelineV1Paginator extends TweetTimelineV1Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'statuses/mentions_timeline.json';
    }
}
// User
export class UserTimelineV1Paginator extends TweetTimelineV1Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'statuses/user_timeline.json';
    }
}
// Lists
export class ListTimelineV1Paginator extends TweetTimelineV1Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'lists/statuses.json';
    }
}
// Favorites
export class UserFavoritesV1Paginator extends TweetTimelineV1Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'favorites/list.json';
    }
}
