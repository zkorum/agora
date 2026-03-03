import { AccountProfileV1Params, AccountSettingsV1, AccountSettingsV1Params, AddOrRemoveListMembersV1Params, FriendshipCreateOrDestroyV1, FriendshipCreateV1Params, FriendshipDestroyV1Params, FriendshipUpdateV1Params, FriendshipV1, GetListV1Params, ListCreateV1Params, ListV1, MediaMetadataV1Params, MediaStatusV1Result, MediaSubtitleV1Param, ProfileBannerUpdateV1Params, ProfileImageUpdateV1Params, ReportSpamV1Params, SendTweetV1Params, TUploadableMedia, TweetV1, UpdateListV1Params, UploadMediaV1Params, UserV1 } from '../types';
import TwitterApiv1ReadOnly from './client.v1.read';
import { TFileHandle } from './media-helpers.v1';
/**
 * Base Twitter v1 client with read/write rights.
 */
export default class TwitterApiv1ReadWrite extends TwitterApiv1ReadOnly {
    protected _prefix: string;
    /**
     * Get a client with only read rights.
     */
    get readOnly(): TwitterApiv1ReadOnly;
    /**
     * Post a new tweet.
     * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/post-statuses-update
     */
    tweet(status: string, payload?: Partial<SendTweetV1Params>): Promise<TweetV1>;
    /**
     * Quote an existing tweet.
     * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/post-statuses-update
     */
    quote(status: string, quotingStatusId: string, payload?: Partial<SendTweetV1Params>): Promise<TweetV1>;
    /**
     * Post a series of tweets.
     * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/post-statuses-update
     */
    tweetThread(tweets: (SendTweetV1Params | string)[]): Promise<TweetV1[]>;
    /**
     * Reply to an existing tweet. Shortcut to `.tweet` with tweaked parameters.
     * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/post-statuses-update
     */
    reply(status: string, in_reply_to_status_id: string, payload?: Partial<SendTweetV1Params>): Promise<TweetV1>;
    /**
     * Delete an existing tweet belonging to you.
     * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/post-statuses-destroy-id
     */
    deleteTweet(tweetId: string): Promise<TweetV1>;
    /**
     * Report the specified user as a spam account to Twitter.
     * Additionally, optionally performs the equivalent of POST blocks/create on behalf of the authenticated user.
     * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/mute-block-report-users/api-reference/post-users-report_spam
     */
    reportUserAsSpam(options: ReportSpamV1Params): Promise<UserV1>;
    /**
     * Turn on/off Retweets and device notifications from the specified user.
     * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/post-friendships-update
     */
    updateFriendship(options: Partial<FriendshipUpdateV1Params>): Promise<FriendshipV1>;
    /**
     * Follow the specified user.
     * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/post-friendships-create
     */
    createFriendship(options: Partial<FriendshipCreateV1Params>): Promise<FriendshipCreateOrDestroyV1>;
    /**
     * Unfollow the specified user.
     * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/post-friendships-destroy
     */
    destroyFriendship(options: Partial<FriendshipDestroyV1Params>): Promise<FriendshipCreateOrDestroyV1>;
    /**
     * Update current account settings for authenticating user.
     * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/get-account-settings
     */
    updateAccountSettings(options: Partial<AccountSettingsV1Params>): Promise<AccountSettingsV1>;
    /**
     * Sets some values that users are able to set under the "Account" tab of their settings page.
     * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/post-account-update_profile
     */
    updateAccountProfile(options: Partial<AccountProfileV1Params>): Promise<UserV1>;
    /**
     * Uploads a profile banner on behalf of the authenticating user.
     * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/post-account-update_profile_banner
     */
    updateAccountProfileBanner(file: TUploadableMedia, options?: Partial<ProfileBannerUpdateV1Params>): Promise<void>;
    /**
     * Updates the authenticating user's profile image.
     * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/post-account-update_profile_image
     */
    updateAccountProfileImage(file: TUploadableMedia, options?: Partial<ProfileImageUpdateV1Params>): Promise<UserV1>;
    /**
     * Removes the uploaded profile banner for the authenticating user.
     * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/post-account-remove_profile_banner
     */
    removeAccountProfileBanner(): Promise<void>;
    /**
     * Creates a new list for the authenticated user.
     * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/post-lists-create
     */
    createList(options: ListCreateV1Params): Promise<ListV1>;
    /**
     * Updates the specified list. The authenticated user must own the list to be able to update it.
     * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/post-lists-update
     */
    updateList(options: UpdateListV1Params): Promise<ListV1>;
    /**
     * Deletes the specified list. The authenticated user must own the list to be able to destroy it.
     * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/post-lists-destroy
     */
    removeList(options: GetListV1Params): Promise<ListV1>;
    /**
     * Adds multiple members to a list, by specifying a comma-separated list of member ids or screen names.
     * If you add a single `user_id` or `screen_name`, it will target `lists/members/create.json`, otherwise
     * it will target `lists/members/create_all.json`.
     * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/post-lists-members-create_all
     */
    addListMembers(options: AddOrRemoveListMembersV1Params): Promise<void>;
    /**
     * Removes one or more members from a list, by specifying a comma-separated list of member ids or screen names.
     * If you add a single `user_id` or `screen_name`, it will target `lists/members/destroy.json`, otherwise
     * it will target `lists/members/destroy_all.json`.
     * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/post-lists-members-destroy_all
     */
    removeListMembers(options: AddOrRemoveListMembersV1Params): Promise<void>;
    /**
     * Subscribes the authenticated user to the specified list.
     * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/post-lists-subscribers-create
     */
    subscribeToList(options: GetListV1Params): Promise<ListV1>;
    /**
     * Unsubscribes the authenticated user of the specified list.
     * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/post-lists-subscribers-destroy
     */
    unsubscribeOfList(options: GetListV1Params): Promise<ListV1>;
    /**
     * This endpoint can be used to provide additional information about the uploaded media_id.
     * This feature is currently only supported for images and GIFs.
     * https://developer.x.com/en/docs/twitter-api/v1/media/upload-media/api-reference/post-media-metadata-create
     */
    createMediaMetadata(mediaId: string, metadata: Partial<MediaMetadataV1Params>): Promise<void>;
    /**
     * Use this endpoint to associate uploaded subtitles to an uploaded video. You can associate subtitles to video before or after Tweeting.
     * **To obtain subtitle media ID, you must upload each subtitle file separately using `.uploadMedia()` method.**
     *
     * https://developer.x.com/en/docs/twitter-api/v1/media/upload-media/api-reference/post-media-subtitles-create
     */
    createMediaSubtitles(mediaId: string, subtitles: MediaSubtitleV1Param[]): Promise<void>;
    /**
     * Use this endpoint to dissociate subtitles from a video and delete the subtitles. You can dissociate subtitles from a video before or after Tweeting.
     * https://developer.x.com/en/docs/twitter-api/v1/media/upload-media/api-reference/post-media-subtitles-delete
     */
    deleteMediaSubtitles(mediaId: string, ...languages: string[]): Promise<void>;
    /**
     * Upload a media (JPG/PNG/GIF/MP4/MOV/WEBP) or subtitle (SRT) to Twitter and return the media_id to use in tweet/DM send.
     *
     * @param file If `string`, filename is supposed.
     * A `Buffer` is a raw file.
     * `fs.promises.FileHandle` or `number` are file pointers.
     *
     * @param options.type File type (Enum 'jpg' | 'longmp4' | 'mp4' | 'mov | 'png' | 'gif' | 'srt' | 'webp').
     * If filename is given, it could be guessed with file extension, otherwise this parameter is mandatory.
     * If type is not part of the enum, it will be used as mime type.
     *
     * Type `longmp4` is **required** is you try to upload a video higher than 140 seconds.
     *
     * @param options.chunkLength Maximum chunk length sent to Twitter. Default goes to 1 MB.
     *
     * @param options.additionalOwners Other user IDs allowed to use the returned media_id. Default goes to none.
     *
     * @param options.maxConcurrentUploads Maximum uploaded chunks in the same time. Default goes to 3.
     *
     * @param options.target Target type `tweet` or `dm`. Defaults to `tweet`.
     * You must specify it if you send a media to use in DMs.
     *
     * @param returnFullMediaData If set to true, returns the whole media information instead of just the media_id
     */
    uploadMedia(file: TUploadableMedia, options: Partial<UploadMediaV1Params>, returnFullMediaData: true): Promise<MediaStatusV1Result>;
    uploadMedia(file: TUploadableMedia, options?: Partial<UploadMediaV1Params>): Promise<string>;
    protected awaitForMediaProcessingCompletion(fullMediaData: MediaStatusV1Result): Promise<void>;
    protected getUploadMediaRequirements(file: TUploadableMedia, { mimeType, type, target, longVideo }?: Partial<UploadMediaV1Params>): Promise<{
        fileHandle: TFileHandle;
        mediaCategory: string;
        fileSize: number;
        mimeType: string;
    }>;
    protected mediaChunkedUpload(fileHandle: TFileHandle, chunkLength: number, mediaId: string, maxConcurrentUploads?: number): Promise<void>;
}
