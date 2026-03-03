import { API_ADS_SANDBOX_PREFIX } from '../globals';
import TwitterAdsSandboxReadWrite from './client.ads-sandbox.write';
/**
 * Twitter ads sandbox client with all rights (read/write)
 */
export class TwitterAdsSandbox extends TwitterAdsSandboxReadWrite {
    constructor() {
        super(...arguments);
        this._prefix = API_ADS_SANDBOX_PREFIX;
    }
    /**
     * Get a client with read/write rights.
     */
    get readWrite() {
        return this;
    }
}
export default TwitterAdsSandbox;
