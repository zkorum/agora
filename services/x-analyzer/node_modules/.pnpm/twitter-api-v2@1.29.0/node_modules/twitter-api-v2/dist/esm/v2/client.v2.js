import { API_V2_PREFIX } from '../globals';
import TwitterApiv2ReadWrite from './client.v2.write';
import TwitterApiv2Labs from '../v2-labs/client.v2.labs';
/**
 * Twitter v2 client with all rights (read/write/DMs)
 */
export class TwitterApiv2 extends TwitterApiv2ReadWrite {
    constructor() {
        super(...arguments);
        this._prefix = API_V2_PREFIX;
        /** API endpoints */
    }
    /* Sub-clients */
    /**
     * Get a client with read/write rights.
     */
    get readWrite() {
        return this;
    }
    /**
     * Get a client for v2 labs endpoints.
     */
    get labs() {
        if (this._labs)
            return this._labs;
        return this._labs = new TwitterApiv2Labs(this);
    }
}
export default TwitterApiv2;
