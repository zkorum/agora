import TwitterApiSubClient from '../client.subclient';
import { API_V2_PREFIX } from '../globals';
import { TweetSearchAllV2Paginator, TweetSearchRecentV2Paginator, TweetUserMentionTimelineV2Paginator, TweetUserTimelineV2Paginator, TweetV2UserLikedTweetsPaginator, UserOwnedListsV2Paginator, UserListMembershipsV2Paginator, UserListFollowedV2Paginator, TweetV2ListTweetsPaginator, TweetBookmarksTimelineV2Paginator, QuotedTweetsTimelineV2Paginator, TweetHomeTimelineV2Paginator, } from '../paginators';
import TwitterApiv2LabsReadOnly from '../v2-labs/client.v2.labs.read';
import { TweetLikingUsersV2Paginator, TweetRetweetersUsersV2Paginator, UserBlockingUsersV2Paginator, UserFollowersV2Paginator, UserFollowingV2Paginator, UserListFollowersV2Paginator, UserListMembersV2Paginator, UserMutingUsersV2Paginator } from '../paginators/user.paginator.v2';
import { isTweetStreamV2ErrorPayload } from '../helpers';
import { ConversationDMTimelineV2Paginator, FullDMTimelineV2Paginator, OneToOneDMTimelineV2Paginator } from '../paginators/dm.paginator.v2';
/**
 * Base Twitter v2 client with only read right.
 */
export default class TwitterApiv2ReadOnly extends TwitterApiSubClient {
    constructor() {
        super(...arguments);
        this._prefix = API_V2_PREFIX;
    }
    /* Sub-clients */
    /**
     * Get a client for v2 labs endpoints.
     */
    get labs() {
        if (this._labs)
            return this._labs;
        return this._labs = new TwitterApiv2LabsReadOnly(this);
    }
    async search(queryOrOptions, options = {}) {
        const queryParams = typeof queryOrOptions === 'string' ?
            { ...options, query: queryOrOptions } :
            { ...queryOrOptions };
        const initialRq = await this.get('tweets/search/recent', queryParams, { fullResponse: true });
        return new TweetSearchRecentV2Paginator({
            realData: initialRq.data,
            rateLimit: initialRq.rateLimit,
            instance: this,
            queryParams,
        });
    }
    /**
     * The full-archive search endpoint returns the complete history of public Tweets matching a search query;
     * since the first Tweet was created March 26, 2006.
     *
     * This endpoint is only available to those users who have been approved for the Academic Research product track.
     * https://developer.x.com/en/docs/twitter-api/tweets/search/api-reference/get-tweets-search-all
     */
    async searchAll(query, options = {}) {
        const queryParams = { ...options, query };
        const initialRq = await this.get('tweets/search/all', queryParams, { fullResponse: true });
        return new TweetSearchAllV2Paginator({
            realData: initialRq.data,
            rateLimit: initialRq.rateLimit,
            instance: this,
            queryParams,
        });
    }
    /**
     * Returns a variety of information about a single Tweet specified by the requested ID.
     * https://developer.x.com/en/docs/twitter-api/tweets/lookup/api-reference/get-tweets-id
     *
     * OAuth2 scope: `users.read`, `tweet.read`
     */
    singleTweet(tweetId, options = {}) {
        return this.get('tweets/:id', options, { params: { id: tweetId } });
    }
    /**
     * Returns a variety of information about tweets specified by list of IDs.
     * https://developer.x.com/en/docs/twitter-api/tweets/lookup/api-reference/get-tweets
     *
     * OAuth2 scope: `users.read`, `tweet.read`
     */
    tweets(tweetIds, options = {}) {
        return this.get('tweets', { ids: tweetIds, ...options });
    }
    /**
     * The recent Tweet counts endpoint returns count of Tweets from the last seven days that match a search query.
     * OAuth2 Bearer auth only.
     * https://developer.x.com/en/docs/twitter-api/tweets/counts/api-reference/get-tweets-counts-recent
     */
    tweetCountRecent(query, options = {}) {
        return this.get('tweets/counts/recent', { query, ...options });
    }
    /**
     * This endpoint is only available to those users who have been approved for the Academic Research product track.
     * The full-archive search endpoint returns the complete history of public Tweets matching a search query;
     * since the first Tweet was created March 26, 2006.
     * OAuth2 Bearer auth only.
     * **This endpoint has pagination, yet it is not supported by bundled paginators. Use `next_token` to fetch next page.**
     * https://developer.x.com/en/docs/twitter-api/tweets/counts/api-reference/get-tweets-counts-all
     */
    tweetCountAll(query, options = {}) {
        return this.get('tweets/counts/all', { query, ...options });
    }
    async tweetRetweetedBy(tweetId, options = {}) {
        const { asPaginator, ...parameters } = options;
        const initialRq = await this.get('tweets/:id/retweeted_by', parameters, {
            fullResponse: true,
            params: { id: tweetId },
        });
        if (!asPaginator) {
            return initialRq.data;
        }
        return new TweetRetweetersUsersV2Paginator({
            realData: initialRq.data,
            rateLimit: initialRq.rateLimit,
            instance: this,
            queryParams: parameters,
            sharedParams: { id: tweetId },
        });
    }
    async tweetLikedBy(tweetId, options = {}) {
        const { asPaginator, ...parameters } = options;
        const initialRq = await this.get('tweets/:id/liking_users', parameters, {
            fullResponse: true,
            params: { id: tweetId },
        });
        if (!asPaginator) {
            return initialRq.data;
        }
        return new TweetLikingUsersV2Paginator({
            realData: initialRq.data,
            rateLimit: initialRq.rateLimit,
            instance: this,
            queryParams: parameters,
            sharedParams: { id: tweetId },
        });
    }
    /**
     * Allows you to retrieve a collection of the most recent Tweets and Retweets posted by you and users you follow, also known as home timeline.
     * This endpoint returns up to the last 3200 Tweets.
     * https://developer.x.com/en/docs/twitter-api/tweets/timelines/api-reference/get-users-id-reverse-chronological
     *
     * OAuth 2 scopes: `tweet.read` `users.read`
     */
    async homeTimeline(options = {}) {
        const meUser = await this.getCurrentUserV2Object();
        const initialRq = await this.get('users/:id/timelines/reverse_chronological', options, {
            fullResponse: true,
            params: { id: meUser.data.id },
        });
        return new TweetHomeTimelineV2Paginator({
            realData: initialRq.data,
            rateLimit: initialRq.rateLimit,
            instance: this,
            queryParams: options,
            sharedParams: { id: meUser.data.id },
        });
    }
    /**
     * Returns Tweets composed by a single user, specified by the requested user ID.
     * By default, the most recent ten Tweets are returned per request.
     * Using pagination, the most recent 3,200 Tweets can be retrieved.
     * https://developer.x.com/en/docs/twitter-api/tweets/timelines/api-reference/get-users-id-tweets
     */
    async userTimeline(userId, options = {}) {
        const initialRq = await this.get('users/:id/tweets', options, {
            fullResponse: true,
            params: { id: userId },
        });
        return new TweetUserTimelineV2Paginator({
            realData: initialRq.data,
            rateLimit: initialRq.rateLimit,
            instance: this,
            queryParams: options,
            sharedParams: { id: userId },
        });
    }
    /**
     * Returns Tweets mentioning a single user specified by the requested user ID.
     * By default, the most recent ten Tweets are returned per request.
     * Using pagination, up to the most recent 800 Tweets can be retrieved.
     * https://developer.x.com/en/docs/twitter-api/tweets/timelines/api-reference/get-users-id-mentions
     */
    async userMentionTimeline(userId, options = {}) {
        const initialRq = await this.get('users/:id/mentions', options, {
            fullResponse: true,
            params: { id: userId },
        });
        return new TweetUserMentionTimelineV2Paginator({
            realData: initialRq.data,
            rateLimit: initialRq.rateLimit,
            instance: this,
            queryParams: options,
            sharedParams: { id: userId },
        });
    }
    /**
     * Returns Quote Tweets for a Tweet specified by the requested Tweet ID.
     * https://developer.x.com/en/docs/twitter-api/tweets/quote-tweets/api-reference/get-tweets-id-quote_tweets
     *
     * OAuth2 scopes: `users.read` `tweet.read`
     */
    async quotes(tweetId, options = {}) {
        const initialRq = await this.get('tweets/:id/quote_tweets', options, {
            fullResponse: true,
            params: { id: tweetId },
        });
        return new QuotedTweetsTimelineV2Paginator({
            realData: initialRq.data,
            rateLimit: initialRq.rateLimit,
            instance: this,
            queryParams: options,
            sharedParams: { id: tweetId },
        });
    }
    /* Bookmarks */
    /**
     * Allows you to get information about a authenticated user’s 800 most recent bookmarked Tweets.
     * https://developer.x.com/en/docs/twitter-api/tweets/bookmarks/api-reference/get-users-id-bookmarks
     *
     * OAuth2 scopes: `users.read` `tweet.read` `bookmark.read`
     */
    async bookmarks(options = {}) {
        const user = await this.getCurrentUserV2Object();
        const initialRq = await this.get('users/:id/bookmarks', options, {
            fullResponse: true,
            params: { id: user.data.id },
        });
        return new TweetBookmarksTimelineV2Paginator({
            realData: initialRq.data,
            rateLimit: initialRq.rateLimit,
            instance: this,
            queryParams: options,
            sharedParams: { id: user.data.id },
        });
    }
    /* Users */
    /**
     * Returns information about an authorized user.
     * https://developer.x.com/en/docs/twitter-api/users/lookup/api-reference/get-users-me
     *
     * OAuth2 scopes: `tweet.read` & `users.read`
     */
    me(options = {}) {
        return this.get('users/me', options);
    }
    /**
     * Returns a variety of information about a single user specified by the requested ID.
     * https://developer.x.com/en/docs/twitter-api/users/lookup/api-reference/get-users-id
     */
    user(userId, options = {}) {
        return this.get('users/:id', options, { params: { id: userId } });
    }
    /**
     * Returns a variety of information about one or more users specified by the requested IDs.
     * https://developer.x.com/en/docs/twitter-api/users/lookup/api-reference/get-users
     */
    users(userIds, options = {}) {
        const ids = Array.isArray(userIds) ? userIds.join(',') : userIds;
        return this.get('users', { ...options, ids });
    }
    /**
     * Returns a variety of information about a single user specified by their username.
     * https://developer.x.com/en/docs/twitter-api/users/lookup/api-reference/get-users-by-username-username
     */
    userByUsername(username, options = {}) {
        return this.get('users/by/username/:username', options, { params: { username } });
    }
    /**
     * Returns a variety of information about one or more users specified by their usernames.
     * https://developer.x.com/en/docs/twitter-api/users/lookup/api-reference/get-users-by
     *
     * OAuth2 scope: `users.read`, `tweet.read`
     */
    usersByUsernames(usernames, options = {}) {
        usernames = Array.isArray(usernames) ? usernames.join(',') : usernames;
        return this.get('users/by', { ...options, usernames });
    }
    async followers(userId, options = {}) {
        const { asPaginator, ...parameters } = options;
        const params = { id: userId };
        if (!asPaginator) {
            return this.get('users/:id/followers', parameters, { params });
        }
        const initialRq = await this.get('users/:id/followers', parameters, { fullResponse: true, params });
        return new UserFollowersV2Paginator({
            realData: initialRq.data,
            rateLimit: initialRq.rateLimit,
            instance: this,
            queryParams: parameters,
            sharedParams: params,
        });
    }
    async following(userId, options = {}) {
        const { asPaginator, ...parameters } = options;
        const params = { id: userId };
        if (!asPaginator) {
            return this.get('users/:id/following', parameters, { params });
        }
        const initialRq = await this.get('users/:id/following', parameters, { fullResponse: true, params });
        return new UserFollowingV2Paginator({
            realData: initialRq.data,
            rateLimit: initialRq.rateLimit,
            instance: this,
            queryParams: parameters,
            sharedParams: params,
        });
    }
    /**
     * Allows you to get information about a user’s liked Tweets.
     * https://developer.x.com/en/docs/twitter-api/tweets/likes/api-reference/get-users-id-liked_tweets
     */
    async userLikedTweets(userId, options = {}) {
        const params = { id: userId };
        const initialRq = await this.get('users/:id/liked_tweets', options, { fullResponse: true, params });
        return new TweetV2UserLikedTweetsPaginator({
            realData: initialRq.data,
            rateLimit: initialRq.rateLimit,
            instance: this,
            queryParams: { ...options },
            sharedParams: params,
        });
    }
    /**
     * Returns a list of users who are blocked by the authenticating user.
     * https://developer.x.com/en/docs/twitter-api/users/blocks/api-reference/get-users-blocking
     */
    async userBlockingUsers(userId, options = {}) {
        const params = { id: userId };
        const initialRq = await this.get('users/:id/blocking', options, { fullResponse: true, params });
        return new UserBlockingUsersV2Paginator({
            realData: initialRq.data,
            rateLimit: initialRq.rateLimit,
            instance: this,
            queryParams: { ...options },
            sharedParams: params,
        });
    }
    /**
     * Returns a list of users who are muted by the authenticating user.
     * https://developer.x.com/en/docs/twitter-api/users/mutes/api-reference/get-users-muting
     */
    async userMutingUsers(userId, options = {}) {
        const params = { id: userId };
        const initialRq = await this.get('users/:id/muting', options, { fullResponse: true, params });
        return new UserMutingUsersV2Paginator({
            realData: initialRq.data,
            rateLimit: initialRq.rateLimit,
            instance: this,
            queryParams: { ...options },
            sharedParams: params,
        });
    }
    /* Lists */
    /**
     * Returns the details of a specified List.
     * https://developer.x.com/en/docs/twitter-api/lists/list-lookup/api-reference/get-lists-id
     */
    list(id, options = {}) {
        return this.get('lists/:id', options, { params: { id } });
    }
    /**
     * Returns all Lists owned by the specified user.
     * https://developer.x.com/en/docs/twitter-api/lists/list-lookup/api-reference/get-users-id-owned_lists
     */
    async listsOwned(userId, options = {}) {
        const params = { id: userId };
        const initialRq = await this.get('users/:id/owned_lists', options, { fullResponse: true, params });
        return new UserOwnedListsV2Paginator({
            realData: initialRq.data,
            rateLimit: initialRq.rateLimit,
            instance: this,
            queryParams: { ...options },
            sharedParams: params,
        });
    }
    /**
     * Returns all Lists a specified user is a member of.
     * https://developer.x.com/en/docs/twitter-api/lists/list-members/api-reference/get-users-id-list_memberships
     */
    async listMemberships(userId, options = {}) {
        const params = { id: userId };
        const initialRq = await this.get('users/:id/list_memberships', options, { fullResponse: true, params });
        return new UserListMembershipsV2Paginator({
            realData: initialRq.data,
            rateLimit: initialRq.rateLimit,
            instance: this,
            queryParams: { ...options },
            sharedParams: params,
        });
    }
    /**
     * Returns all Lists a specified user follows.
     * https://developer.x.com/en/docs/twitter-api/lists/list-follows/api-reference/get-users-id-followed_lists
     */
    async listFollowed(userId, options = {}) {
        const params = { id: userId };
        const initialRq = await this.get('users/:id/followed_lists', options, { fullResponse: true, params });
        return new UserListFollowedV2Paginator({
            realData: initialRq.data,
            rateLimit: initialRq.rateLimit,
            instance: this,
            queryParams: { ...options },
            sharedParams: params,
        });
    }
    /**
     * Returns a list of Tweets from the specified List.
     * https://developer.x.com/en/docs/twitter-api/lists/list-tweets/api-reference/get-lists-id-tweets
     */
    async listTweets(listId, options = {}) {
        const params = { id: listId };
        const initialRq = await this.get('lists/:id/tweets', options, { fullResponse: true, params });
        return new TweetV2ListTweetsPaginator({
            realData: initialRq.data,
            rateLimit: initialRq.rateLimit,
            instance: this,
            queryParams: { ...options },
            sharedParams: params,
        });
    }
    /**
     * Returns a list of users who are members of the specified List.
     * https://developer.x.com/en/docs/twitter-api/lists/list-members/api-reference/get-lists-id-members
     */
    async listMembers(listId, options = {}) {
        const params = { id: listId };
        const initialRq = await this.get('lists/:id/members', options, { fullResponse: true, params });
        return new UserListMembersV2Paginator({
            realData: initialRq.data,
            rateLimit: initialRq.rateLimit,
            instance: this,
            queryParams: { ...options },
            sharedParams: params,
        });
    }
    /**
     * Returns a list of users who are followers of the specified List.
     * https://developer.x.com/en/docs/twitter-api/lists/list-follows/api-reference/get-lists-id-followers
     */
    async listFollowers(listId, options = {}) {
        const params = { id: listId };
        const initialRq = await this.get('lists/:id/followers', options, { fullResponse: true, params });
        return new UserListFollowersV2Paginator({
            realData: initialRq.data,
            rateLimit: initialRq.rateLimit,
            instance: this,
            queryParams: { ...options },
            sharedParams: params,
        });
    }
    /* Direct messages */
    /**
     * Returns a list of Direct Messages for the authenticated user, both sent and received.
     * Direct Message events are returned in reverse chronological order.
     * Supports retrieving events from the previous 30 days.
     *
     * OAuth 2 scopes: `dm.read`, `tweet.read`, `user.read`
     *
     * https://developer.x.com/en/docs/twitter-api/direct-messages/lookup/api-reference/get-dm_events
     */
    async listDmEvents(options = {}) {
        const initialRq = await this.get('dm_events', options, { fullResponse: true });
        return new FullDMTimelineV2Paginator({
            realData: initialRq.data,
            rateLimit: initialRq.rateLimit,
            instance: this,
            queryParams: { ...options },
        });
    }
    /**
     * Returns a list of Direct Messages (DM) events within a 1-1 conversation with the user specified in the participant_id path parameter.
     * Messages are returned in reverse chronological order.
     *
     * OAuth 2 scopes: `dm.read`, `tweet.read`, `user.read`
     *
     * https://developer.x.com/en/docs/twitter-api/direct-messages/lookup/api-reference/get-dm_conversations-dm_conversation_id-dm_events
     */
    async listDmEventsWithParticipant(participantId, options = {}) {
        const params = { participant_id: participantId };
        const initialRq = await this.get('dm_conversations/with/:participant_id/dm_events', options, { fullResponse: true, params });
        return new OneToOneDMTimelineV2Paginator({
            realData: initialRq.data,
            rateLimit: initialRq.rateLimit,
            instance: this,
            queryParams: { ...options },
            sharedParams: params,
        });
    }
    /**
     * Returns a list of Direct Messages within a conversation specified in the dm_conversation_id path parameter.
     * Messages are returned in reverse chronological order.
     *
     * OAuth 2 scopes: `dm.read`, `tweet.read`, `user.read`
     *
     * https://developer.x.com/en/docs/twitter-api/direct-messages/lookup/api-reference/get-dm_conversations-dm_conversation_id-dm_events
     */
    async listDmEventsOfConversation(dmConversationId, options = {}) {
        const params = { dm_conversation_id: dmConversationId };
        const initialRq = await this.get('dm_conversations/:dm_conversation_id/dm_events', options, { fullResponse: true, params });
        return new ConversationDMTimelineV2Paginator({
            realData: initialRq.data,
            rateLimit: initialRq.rateLimit,
            instance: this,
            queryParams: { ...options },
            sharedParams: params,
        });
    }
    /* Spaces */
    /**
     * Get a single space by ID.
     * https://developer.x.com/en/docs/twitter-api/spaces/lookup/api-reference/get-spaces-id
     *
     * OAuth2 scopes: `tweet.read`, `users.read`, `space.read`.
     */
    space(spaceId, options = {}) {
        return this.get('spaces/:id', options, { params: { id: spaceId } });
    }
    /**
     * Get spaces using their IDs.
     * https://developer.x.com/en/docs/twitter-api/spaces/lookup/api-reference/get-spaces
     *
     * OAuth2 scopes: `tweet.read`, `users.read`, `space.read`.
     */
    spaces(spaceIds, options = {}) {
        return this.get('spaces', { ids: spaceIds, ...options });
    }
    /**
     * Get spaces using their creator user ID(s). (no pagination available)
     * https://developer.x.com/en/docs/twitter-api/spaces/lookup/api-reference/get-spaces-by-creator-ids
     *
     * OAuth2 scopes: `tweet.read`, `users.read`, `space.read`.
     */
    spacesByCreators(creatorIds, options = {}) {
        return this.get('spaces/by/creator_ids', { user_ids: creatorIds, ...options });
    }
    /**
     * Search through spaces using multiple params. (no pagination available)
     * https://developer.x.com/en/docs/twitter-api/spaces/search/api-reference/get-spaces-search
     */
    searchSpaces(options) {
        return this.get('spaces/search', options);
    }
    /**
    * Returns a list of user who purchased a ticket to the requested Space.
    * You must authenticate the request using the Access Token of the creator of the requested Space.
    *
    * **OAuth 2.0 Access Token required**
    *
    * https://developer.x.com/en/docs/twitter-api/spaces/lookup/api-reference/get-spaces-id-buyers
    *
    * OAuth2 scopes: `tweet.read`, `users.read`, `space.read`.
    */
    spaceBuyers(spaceId, options = {}) {
        return this.get('spaces/:id/buyers', options, { params: { id: spaceId } });
    }
    /**
     * Returns Tweets shared in the requested Spaces.
     * https://developer.x.com/en/docs/twitter-api/spaces/lookup/api-reference/get-spaces-id-tweets
     *
     * OAuth2 scope: `users.read`, `tweet.read`, `space.read`
     */
    spaceTweets(spaceId, options = {}) {
        return this.get('spaces/:id/tweets', options, { params: { id: spaceId } });
    }
    searchStream({ autoConnect, ...options } = {}) {
        return this.getStream('tweets/search/stream', options, { payloadIsError: isTweetStreamV2ErrorPayload, autoConnect });
    }
    /**
     * Return a list of rules currently active on the streaming endpoint, either as a list or individually.
     * https://developer.x.com/en/docs/twitter-api/tweets/filtered-stream/api-reference/get-tweets-search-stream-rules
     */
    streamRules(options = {}) {
        return this.get('tweets/search/stream/rules', options);
    }
    updateStreamRules(options, query = {}) {
        return this.post('tweets/search/stream/rules', options, { query });
    }
    sampleStream({ autoConnect, ...options } = {}) {
        return this.getStream('tweets/sample/stream', options, { payloadIsError: isTweetStreamV2ErrorPayload, autoConnect });
    }
    sample10Stream({ autoConnect, ...options } = {}) {
        return this.getStream('tweets/sample10/stream', options, { payloadIsError: isTweetStreamV2ErrorPayload, autoConnect });
    }
    /* Batch compliance */
    /**
     * Returns a list of recent compliance jobs.
     * https://developer.x.com/en/docs/twitter-api/compliance/batch-compliance/api-reference/get-compliance-jobs
     */
    complianceJobs(options) {
        return this.get('compliance/jobs', options);
    }
    /**
     * Get a single compliance job with the specified ID.
     * https://developer.x.com/en/docs/twitter-api/compliance/batch-compliance/api-reference/get-compliance-jobs-id
     */
    complianceJob(jobId) {
        return this.get('compliance/jobs/:id', undefined, { params: { id: jobId } });
    }
    /**
     * Creates a new compliance job for Tweet IDs or user IDs, send your file, await result and parse it into an array.
     * You can run one batch job at a time. Returns the created job, but **not the job result!**.
     *
     * You can obtain the result (**after job is completed**) with `.complianceJobResult`.
     * https://developer.x.com/en/docs/twitter-api/compliance/batch-compliance/api-reference/post-compliance-jobs
     */
    async sendComplianceJob(jobParams) {
        const job = await this.post('compliance/jobs', { type: jobParams.type, name: jobParams.name });
        // Send the IDs
        const rawIdsBody = jobParams.ids instanceof Buffer ? jobParams.ids : Buffer.from(jobParams.ids.join('\n'));
        // Upload the IDs
        await this.put(job.data.upload_url, rawIdsBody, {
            forceBodyMode: 'raw',
            enableAuth: false,
            headers: { 'Content-Type': 'text/plain' },
            prefix: '',
        });
        return job;
    }
    /**
     * Get the result of a running or completed job, obtained through `.complianceJob`, `.complianceJobs` or `.sendComplianceJob`.
     * If job is still running (`in_progress`), it will await until job is completed. **This could be quite long!**
     * https://developer.x.com/en/docs/twitter-api/compliance/batch-compliance/api-reference/post-compliance-jobs
     */
    async complianceJobResult(job) {
        let runningJob = job;
        while (runningJob.status !== 'complete') {
            if (runningJob.status === 'expired' || runningJob.status === 'failed') {
                throw new Error('Job failed to be completed.');
            }
            await new Promise(resolve => setTimeout(resolve, 3500));
            runningJob = (await this.complianceJob(job.id)).data;
        }
        // Download and parse result
        const result = await this.get(job.download_url, undefined, {
            enableAuth: false,
            prefix: '',
        });
        return result
            .trim()
            .split('\n')
            .filter(line => line)
            .map(line => JSON.parse(line));
    }
    /* Usage */
    /**
     * Allows you to retrieve your project usage.
     *
     * https://developer.x.com/en/docs/x-api/usage/tweets/introduction
     */
    async usage(options = {}) {
        return this.get('usage/tweets', options);
    }
    /**
     * Returns a variety of information about a single Community specified by ID.
     * https://docs.x.com/x-api/communities/communities-lookup-by-community-id
     */
    community(communityId, options = {}) {
        return this.get('communities/:id', options, { params: { id: communityId } });
    }
    /**
     * Search for Communities based on keywords.
     * https://docs.x.com/x-api/communities/search-communities
     */
    searchCommunities(query, options = {}) {
        return this.get('communities/search', { query, ...options });
    }
}
