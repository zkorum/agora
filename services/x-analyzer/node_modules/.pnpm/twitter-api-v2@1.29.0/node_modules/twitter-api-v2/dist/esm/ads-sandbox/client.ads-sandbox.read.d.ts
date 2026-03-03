import TwitterApiSubClient from '../client.subclient';
/**
 * Base Twitter ads sandbox client with only read rights.
 */
export default class TwitterAdsSandboxReadOnly extends TwitterApiSubClient {
    protected _prefix: string;
}
