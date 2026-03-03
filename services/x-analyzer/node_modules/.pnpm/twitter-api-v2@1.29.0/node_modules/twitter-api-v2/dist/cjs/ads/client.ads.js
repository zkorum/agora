"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwitterAds = void 0;
const globals_1 = require("../globals");
const client_ads_write_1 = __importDefault(require("./client.ads.write"));
const client_ads_sandbox_1 = __importDefault(require("../ads-sandbox/client.ads-sandbox"));
/**
 * Twitter ads client with all rights (read/write)
 */
class TwitterAds extends client_ads_write_1.default {
    constructor() {
        super(...arguments);
        this._prefix = globals_1.API_ADS_PREFIX;
    }
    /**
     * Get a client with read/write rights.
     */
    get readWrite() {
        return this;
    }
    /**
     * Get Twitter Ads Sandbox API client
     */
    get sandbox() {
        if (this._sandbox)
            return this._sandbox;
        return this._sandbox = new client_ads_sandbox_1.default(this);
    }
}
exports.TwitterAds = TwitterAds;
exports.default = TwitterAds;
