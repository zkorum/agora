import { API_ADS_PREFIX } from '../globals';
import TwitterAdsReadWrite from './client.ads.write';
import TwitterAdsSandbox from '../ads-sandbox/client.ads-sandbox';
/**
 * Twitter ads client with all rights (read/write)
 */
export class TwitterAds extends TwitterAdsReadWrite {
    constructor() {
        super(...arguments);
        this._prefix = API_ADS_PREFIX;
    }
    /**
     * Get a client with read/write rights.
     */
    get readWrite() {
        return this;
    }
    /**
     * Get Twitter Ads Sandbox API client
     */
    get sandbox() {
        if (this._sandbox)
            return this._sandbox;
        return this._sandbox = new TwitterAdsSandbox(this);
    }
}
export default TwitterAds;
