import TwitterApiSubClient from '../client.subclient';
/**
 * Base Twitter ads client with only read rights.
 */
export default class TwitterAdsReadOnly extends TwitterApiSubClient {
    protected _prefix: string;
}
