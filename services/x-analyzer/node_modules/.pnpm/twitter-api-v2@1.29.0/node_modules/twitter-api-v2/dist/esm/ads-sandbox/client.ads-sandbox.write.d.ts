import TwitterAdsSandboxReadOnly from './client.ads-sandbox.read';
/**
 * Base Twitter ads sandbox client with read/write rights.
 */
export default class TwitterAdsSandboxReadWrite extends TwitterAdsSandboxReadOnly {
    protected _prefix: string;
    /**
     * Get a client with only read rights.
     */
    get readOnly(): TwitterAdsSandboxReadOnly;
}
