import TwitterAdsReadWrite from './client.ads.write';
import TwitterAdsSandbox from '../ads-sandbox/client.ads-sandbox';
/**
 * Twitter ads client with all rights (read/write)
 */
export declare class TwitterAds extends TwitterAdsReadWrite {
    protected _prefix: string;
    protected _sandbox?: TwitterAdsSandbox;
    /**
     * Get a client with read/write rights.
     */
    get readWrite(): TwitterAdsReadWrite;
    /**
     * Get Twitter Ads Sandbox API client
     */
    get sandbox(): TwitterAdsSandbox;
}
export default TwitterAds;
