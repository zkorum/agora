import TwitterAdsSandboxReadWrite from './client.ads-sandbox.write';
/**
 * Twitter ads sandbox client with all rights (read/write)
 */
export declare class TwitterAdsSandbox extends TwitterAdsSandboxReadWrite {
    protected _prefix: string;
    /**
     * Get a client with read/write rights.
     */
    get readWrite(): TwitterAdsSandboxReadWrite;
}
export default TwitterAdsSandbox;
