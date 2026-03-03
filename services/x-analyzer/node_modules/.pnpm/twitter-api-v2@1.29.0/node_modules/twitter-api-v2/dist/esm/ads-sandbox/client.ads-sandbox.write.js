import { API_ADS_SANDBOX_PREFIX } from '../globals';
import TwitterAdsSandboxReadOnly from './client.ads-sandbox.read';
/**
 * Base Twitter ads sandbox client with read/write rights.
 */
export default class TwitterAdsSandboxReadWrite extends TwitterAdsSandboxReadOnly {
    constructor() {
        super(...arguments);
        this._prefix = API_ADS_SANDBOX_PREFIX;
    }
    /**
     * Get a client with only read rights.
     */
    get readOnly() {
        return this;
    }
}
