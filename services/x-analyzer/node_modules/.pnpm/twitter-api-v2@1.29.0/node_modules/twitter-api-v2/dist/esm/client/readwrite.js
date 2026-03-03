import TwitterApiv1ReadWrite from '../v1/client.v1.write';
import TwitterApiv2ReadWrite from '../v2/client.v2.write';
import TwitterApiReadOnly from './readonly';
/**
 * Twitter v1.1 and v2 API client.
 */
export default class TwitterApiReadWrite extends TwitterApiReadOnly {
    /* Direct access to subclients */
    get v1() {
        if (this._v1)
            return this._v1;
        return this._v1 = new TwitterApiv1ReadWrite(this);
    }
    get v2() {
        if (this._v2)
            return this._v2;
        return this._v2 = new TwitterApiv2ReadWrite(this);
    }
    /**
     * Get a client with read only rights.
     */
    get readOnly() {
        return this;
    }
}
