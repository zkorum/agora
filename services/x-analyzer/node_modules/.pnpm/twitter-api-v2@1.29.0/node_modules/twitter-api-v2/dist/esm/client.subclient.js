import TwitterApiBase from './client.base';
/**
 * Base subclient for every v1 and v2 client.
 */
export default class TwitterApiSubClient extends TwitterApiBase {
    constructor(instance) {
        if (!(instance instanceof TwitterApiBase)) {
            throw new Error('You must instance SubTwitterApi instance from existing TwitterApi instance.');
        }
        super(instance);
    }
}
