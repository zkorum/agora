import * as crypto from 'crypto';
export class OAuth2Helper {
    static getCodeVerifier() {
        return this.generateRandomString(128);
    }
    static getCodeChallengeFromVerifier(verifier) {
        return this.escapeBase64Url(crypto
            .createHash('sha256')
            .update(verifier)
            .digest('base64'));
    }
    static getAuthHeader(clientId, clientSecret) {
        const key = encodeURIComponent(clientId) + ':' + encodeURIComponent(clientSecret);
        return Buffer.from(key).toString('base64');
    }
    static generateRandomString(length) {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
        for (let i = 0; i < length; i++) {
            text += possible[Math.floor(Math.random() * possible.length)];
        }
        return text;
    }
    static escapeBase64Url(string) {
        return string.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    }
}
