import TwitterAdsReadOnly from './client.ads.read';
/**
 * Base Twitter ads client with read/write rights.
 */
export default class TwitterAdsReadWrite extends TwitterAdsReadOnly {
    protected _prefix: string;
    /**
     * Get a client with only read rights.
     */
    get readOnly(): TwitterAdsReadOnly;
}
