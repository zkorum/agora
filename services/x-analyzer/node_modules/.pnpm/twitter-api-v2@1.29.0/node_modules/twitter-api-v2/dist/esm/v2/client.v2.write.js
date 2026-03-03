import { API_V2_PREFIX } from '../globals';
import TwitterApiv2ReadOnly from './client.v2.read';
import TwitterApiv2LabsReadWrite from '../v2-labs/client.v2.labs.write';
/**
 * Base Twitter v2 client with read/write rights.
 */
export default class TwitterApiv2ReadWrite extends TwitterApiv2ReadOnly {
    constructor() {
        super(...arguments);
        this._prefix = API_V2_PREFIX;
    }
    /* Sub-clients */
    /**
     * Get a client with only read rights.
     */
    get readOnly() {
        return this;
    }
    /**
     * Get a client for v2 labs endpoints.
     */
    get labs() {
        if (this._labs)
            return this._labs;
        return this._labs = new TwitterApiv2LabsReadWrite(this);
    }
    /* Tweets */
    /**
     * Hides or unhides a reply to a Tweet.
     * https://developer.x.com/en/docs/twitter-api/tweets/hide-replies/api-reference/put-tweets-id-hidden
     */
    hideReply(tweetId, makeHidden) {
        return this.put('tweets/:id/hidden', { hidden: makeHidden }, { params: { id: tweetId } });
    }
    /**
     * Causes the user ID identified in the path parameter to Like the target Tweet.
     * https://developer.x.com/en/docs/twitter-api/tweets/likes/api-reference/post-users-user_id-likes
     *
     * **Note**: You must specify the currently logged user ID ; you can obtain it through v1.1 API.
     */
    like(loggedUserId, targetTweetId) {
        return this.post('users/:id/likes', { tweet_id: targetTweetId }, { params: { id: loggedUserId } });
    }
    /**
     * Allows a user or authenticated user ID to unlike a Tweet.
     * The request succeeds with no action when the user sends a request to a user they're not liking the Tweet or have already unliked the Tweet.
     * https://developer.x.com/en/docs/twitter-api/tweets/likes/api-reference/delete-users-id-likes-tweet_id
     *
     * **Note**: You must specify the currently logged user ID ; you can obtain it through v1.1 API.
     */
    unlike(loggedUserId, targetTweetId) {
        return this.delete('users/:id/likes/:tweet_id', undefined, {
            params: { id: loggedUserId, tweet_id: targetTweetId },
        });
    }
    /**
     * Causes the user ID identified in the path parameter to Retweet the target Tweet.
     * https://developer.x.com/en/docs/twitter-api/tweets/retweets/api-reference/post-users-id-retweets
     *
     * **Note**: You must specify the currently logged user ID ; you can obtain it through v1.1 API.
     */
    retweet(loggedUserId, targetTweetId) {
        return this.post('users/:id/retweets', { tweet_id: targetTweetId }, { params: { id: loggedUserId } });
    }
    /**
     * Allows a user or authenticated user ID to remove the Retweet of a Tweet.
     * The request succeeds with no action when the user sends a request to a user they're not Retweeting the Tweet or have already removed the Retweet of.
     * https://developer.x.com/en/docs/twitter-api/tweets/retweets/api-reference/delete-users-id-retweets-tweet_id
     *
     * **Note**: You must specify the currently logged user ID ; you can obtain it through v1.1 API.
     */
    unretweet(loggedUserId, targetTweetId) {
        return this.delete('users/:id/retweets/:tweet_id', undefined, {
            params: { id: loggedUserId, tweet_id: targetTweetId },
        });
    }
    tweet(status, payload = {}) {
        if (typeof status === 'object') {
            payload = status;
        }
        else {
            payload = { text: status, ...payload };
        }
        return this.post('tweets', payload);
    }
    /**
     * Uploads media to Twitter using chunked upload.
     * https://docs.x.com/x-api/media/media-upload
     *
     * @param media The media buffer to upload
     * @param options Upload options including media type and category, and additional owners
     * @param chunkSize Size of each chunk in bytes (default: 1MB)
     * @returns The media ID of the uploaded media
     */
    async uploadMedia(media, options, chunkSize = 1024 * 1024) {
        let media_category = options.media_category;
        // If no media category is provided, try to infer it from the media type
        if (!options.media_category) {
            if (options.media_type.includes('gif')) {
                media_category = 'tweet_gif';
            }
            else if (options.media_type.includes('image')) {
                media_category = 'tweet_image';
            }
            else if (options.media_type.includes('video')) {
                media_category = 'tweet_video';
            }
        }
        const initArguments = {
            additional_owners: options.additional_owners,
            media_type: options.media_type,
            total_bytes: media.length,
            media_category,
        };
        const initResponse = await this.post('media/upload/initialize', initArguments);
        const mediaId = initResponse.data.id;
        const chunksCount = Math.ceil(media.length / chunkSize);
        const mediaArray = new Uint8Array(media);
        for (let i = 0; i < chunksCount; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, media.length);
            const mediaChunk = mediaArray.slice(start, end);
            const chunkedBuffer = Buffer.from(mediaChunk);
            const appendArguments = {
                segment_index: i,
                media: chunkedBuffer,
            };
            await this.post(`media/upload/${mediaId}/append`, appendArguments, { forceBodyMode: 'form-data' });
        }
        const finalizeResponse = await this.post(`media/upload/${mediaId}/finalize`);
        if (finalizeResponse.data.processing_info) {
            await this.waitForMediaProcessing(mediaId);
        }
        return mediaId;
    }
    async waitForMediaProcessing(mediaId) {
        var _a;
        const response = await this.get('media/upload', {
            command: 'STATUS',
            media_id: mediaId,
        });
        const info = response.data.processing_info;
        if (!info)
            return;
        switch (info.state) {
            case 'succeeded':
                return;
            case 'failed':
                throw new Error(`Media processing failed: ${(_a = info.error) === null || _a === void 0 ? void 0 : _a.message}`);
            case 'pending':
            case 'in_progress': {
                const waitTime = info === null || info === void 0 ? void 0 : info.check_after_secs;
                if (waitTime && waitTime > 0) {
                    await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
                    await this.waitForMediaProcessing(mediaId);
                }
            }
        }
    }
    /**
     * Creates the metadata for media to be uploaded.
     * This feature is currently only supported for images and GIFs.
     * https://docs.x.com/x-api/media/metadata-create
     */
    createMediaMetadata(mediaId, metadata) {
        return this.post('media/metadata', { id: mediaId, metadata });
    }
    /**
     * Reply to a Tweet on behalf of an authenticated user.
     * https://developer.x.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets
     */
    reply(status, toTweetId, payload = {}) {
        var _a;
        const reply = { in_reply_to_tweet_id: toTweetId, ...(_a = payload.reply) !== null && _a !== void 0 ? _a : {} };
        return this.post('tweets', { text: status, ...payload, reply });
    }
    /**
     * Quote an existing Tweet on behalf of an authenticated user.
     * https://developer.x.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets
     */
    quote(status, quotedTweetId, payload = {}) {
        return this.tweet(status, { ...payload, quote_tweet_id: quotedTweetId });
    }
    /**
     * Post a series of tweets.
     * https://developer.x.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets
     */
    async tweetThread(tweets) {
        var _a, _b;
        const postedTweets = [];
        for (const tweet of tweets) {
            // Retrieve the last sent tweet
            const lastTweet = postedTweets.length ? postedTweets[postedTweets.length - 1] : null;
            // Build the tweet query params
            const queryParams = { ...(typeof tweet === 'string' ? ({ text: tweet }) : tweet) };
            // Reply to an existing tweet if needed
            const inReplyToId = lastTweet ? lastTweet.data.id : (_a = queryParams.reply) === null || _a === void 0 ? void 0 : _a.in_reply_to_tweet_id;
            const status = (_b = queryParams.text) !== null && _b !== void 0 ? _b : '';
            if (inReplyToId) {
                postedTweets.push(await this.reply(status, inReplyToId, queryParams));
            }
            else {
                postedTweets.push(await this.tweet(status, queryParams));
            }
        }
        return postedTweets;
    }
    /**
     * Allows a user or authenticated user ID to delete a Tweet
     * https://developer.x.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/delete-tweets-id
     */
    deleteTweet(tweetId) {
        return this.delete('tweets/:id', undefined, {
            params: {
                id: tweetId,
            },
        });
    }
    /* Bookmarks */
    /**
     * Causes the user ID of an authenticated user identified in the path parameter to Bookmark the target Tweet provided in the request body.
     * https://developer.x.com/en/docs/twitter-api/tweets/bookmarks/api-reference/post-users-id-bookmarks
     *
     * OAuth2 scopes: `users.read` `tweet.read` `bookmark.write`
     */
    async bookmark(tweetId) {
        const user = await this.getCurrentUserV2Object();
        return this.post('users/:id/bookmarks', { tweet_id: tweetId }, { params: { id: user.data.id } });
    }
    /**
     * Allows a user or authenticated user ID to remove a Bookmark of a Tweet.
     * https://developer.x.com/en/docs/twitter-api/tweets/bookmarks/api-reference/delete-users-id-bookmarks-tweet_id
     *
     * OAuth2 scopes: `users.read` `tweet.read` `bookmark.write`
     */
    async deleteBookmark(tweetId) {
        const user = await this.getCurrentUserV2Object();
        return this.delete('users/:id/bookmarks/:tweet_id', undefined, { params: { id: user.data.id, tweet_id: tweetId } });
    }
    /* Users */
    /**
     * Allows a user ID to follow another user.
     * If the target user does not have public Tweets, this endpoint will send a follow request.
     * https://developer.x.com/en/docs/twitter-api/users/follows/api-reference/post-users-source_user_id-following
     *
     * OAuth2 scope: `follows.write`
     *
     * **Note**: You must specify the currently logged user ID ; you can obtain it through v1.1 API.
     */
    follow(loggedUserId, targetUserId) {
        return this.post('users/:id/following', { target_user_id: targetUserId }, { params: { id: loggedUserId } });
    }
    /**
     * Allows a user ID to unfollow another user.
     * https://developer.x.com/en/docs/twitter-api/users/follows/api-reference/delete-users-source_id-following
     *
     * OAuth2 scope: `follows.write`
     *
     * **Note**: You must specify the currently logged user ID ; you can obtain it through v1.1 API.
     */
    unfollow(loggedUserId, targetUserId) {
        return this.delete('users/:source_user_id/following/:target_user_id', undefined, {
            params: { source_user_id: loggedUserId, target_user_id: targetUserId },
        });
    }
    /**
     * Causes the user (in the path) to block the target user.
     * The user (in the path) must match the user context authorizing the request.
     * https://developer.x.com/en/docs/twitter-api/users/blocks/api-reference/post-users-user_id-blocking
     *
     * **Note**: You must specify the currently logged user ID; you can obtain it through v1.1 API.
     */
    block(loggedUserId, targetUserId) {
        return this.post('users/:id/blocking', { target_user_id: targetUserId }, { params: { id: loggedUserId } });
    }
    /**
     * Allows a user or authenticated user ID to unblock another user.
     * https://developer.x.com/en/docs/twitter-api/users/blocks/api-reference/delete-users-user_id-blocking
     *
     * **Note**: You must specify the currently logged user ID ; you can obtain it through v1.1 API.
     */
    unblock(loggedUserId, targetUserId) {
        return this.delete('users/:source_user_id/blocking/:target_user_id', undefined, {
            params: { source_user_id: loggedUserId, target_user_id: targetUserId },
        });
    }
    /**
     * Allows an authenticated user ID to mute the target user.
     * https://developer.x.com/en/docs/twitter-api/users/mutes/api-reference/post-users-user_id-muting
     *
     * **Note**: You must specify the currently logged user ID ; you can obtain it through v1.1 API.
     */
    mute(loggedUserId, targetUserId) {
        return this.post('users/:id/muting', { target_user_id: targetUserId }, { params: { id: loggedUserId } });
    }
    /**
     * Allows an authenticated user ID to unmute the target user.
     * The request succeeds with no action when the user sends a request to a user they're not muting or have already unmuted.
     * https://developer.x.com/en/docs/twitter-api/users/mutes/api-reference/delete-users-user_id-muting
     *
     * **Note**: You must specify the currently logged user ID ; you can obtain it through v1.1 API.
     */
    unmute(loggedUserId, targetUserId) {
        return this.delete('users/:source_user_id/muting/:target_user_id', undefined, {
            params: { source_user_id: loggedUserId, target_user_id: targetUserId },
        });
    }
    /* Lists */
    /**
     * Creates a new list for the authenticated user.
     * https://developer.x.com/en/docs/twitter-api/lists/manage-lists/api-reference/post-lists
     */
    createList(options) {
        return this.post('lists', options);
    }
    /**
     * Updates the specified list. The authenticated user must own the list to be able to update it.
     * https://developer.x.com/en/docs/twitter-api/lists/manage-lists/api-reference/put-lists-id
     */
    updateList(listId, options = {}) {
        return this.put('lists/:id', options, { params: { id: listId } });
    }
    /**
     * Deletes the specified list. The authenticated user must own the list to be able to destroy it.
     * https://developer.x.com/en/docs/twitter-api/lists/manage-lists/api-reference/delete-lists-id
     */
    removeList(listId) {
        return this.delete('lists/:id', undefined, { params: { id: listId } });
    }
    /**
     * Adds a member to a list.
     * https://developer.x.com/en/docs/twitter-api/lists/list-members/api-reference/post-lists-id-members
     */
    addListMember(listId, userId) {
        return this.post('lists/:id/members', { user_id: userId }, { params: { id: listId } });
    }
    /**
     * Remember a member to a list.
     * https://developer.x.com/en/docs/twitter-api/lists/list-members/api-reference/delete-lists-id-members-user_id
     */
    removeListMember(listId, userId) {
        return this.delete('lists/:id/members/:user_id', undefined, { params: { id: listId, user_id: userId } });
    }
    /**
     * Subscribes the authenticated user to the specified list.
     * https://developer.x.com/en/docs/twitter-api/lists/manage-lists/api-reference/post-users-id-followed-lists
     */
    subscribeToList(loggedUserId, listId) {
        return this.post('users/:id/followed_lists', { list_id: listId }, { params: { id: loggedUserId } });
    }
    /**
     * Unsubscribes the authenticated user to the specified list.
     * https://developer.x.com/en/docs/twitter-api/lists/manage-lists/api-reference/delete-users-id-followed-lists-list_id
     */
    unsubscribeOfList(loggedUserId, listId) {
        return this.delete('users/:id/followed_lists/:list_id', undefined, { params: { id: loggedUserId, list_id: listId } });
    }
    /**
     * Enables the authenticated user to pin a List.
     * https://developer.x.com/en/docs/twitter-api/lists/manage-lists/api-reference/post-users-id-pinned-lists
     */
    pinList(loggedUserId, listId) {
        return this.post('users/:id/pinned_lists', { list_id: listId }, { params: { id: loggedUserId } });
    }
    /**
     * Enables the authenticated user to unpin a List.
     * https://developer.x.com/en/docs/twitter-api/lists/manage-lists/api-reference/delete-users-id-pinned-lists-list_id
     */
    unpinList(loggedUserId, listId) {
        return this.delete('users/:id/pinned_lists/:list_id', undefined, { params: { id: loggedUserId, list_id: listId } });
    }
    /* Direct messages */
    /**
     * Creates a Direct Message on behalf of an authenticated user, and adds it to the specified conversation.
     * https://developer.x.com/en/docs/twitter-api/direct-messages/manage/api-reference/post-dm_conversations-dm_conversation_id-messages
     */
    sendDmInConversation(conversationId, message) {
        return this.post('dm_conversations/:dm_conversation_id/messages', message, { params: { dm_conversation_id: conversationId } });
    }
    /**
     * Creates a one-to-one Direct Message and adds it to the one-to-one conversation.
     * This method either creates a new one-to-one conversation or retrieves the current conversation and adds the Direct Message to it.
     * https://developer.x.com/en/docs/twitter-api/direct-messages/manage/api-reference/post-dm_conversations-with-participant_id-messages
     */
    sendDmToParticipant(participantId, message) {
        return this.post('dm_conversations/with/:participant_id/messages', message, { params: { participant_id: participantId } });
    }
    /**
     * Creates a new group conversation and adds a Direct Message to it on behalf of an authenticated user.
     * https://developer.x.com/en/docs/twitter-api/direct-messages/manage/api-reference/post-dm_conversations
     */
    createDmConversation(options) {
        return this.post('dm_conversations', options);
    }
}
