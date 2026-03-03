import { API_V2_LABS_PREFIX } from '../globals';
import TwitterApiv2LabsReadOnly from './client.v2.labs.read';
/**
 * Base Twitter v2 labs client with read/write rights.
 */
export default class TwitterApiv2LabsReadWrite extends TwitterApiv2LabsReadOnly {
    constructor() {
        super(...arguments);
        this._prefix = API_V2_LABS_PREFIX;
    }
    /**
     * Get a client with only read rights.
     */
    get readOnly() {
        return this;
    }
}
