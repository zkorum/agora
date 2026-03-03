"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwitterAdsSandbox = void 0;
const globals_1 = require("../globals");
const client_ads_sandbox_write_1 = __importDefault(require("./client.ads-sandbox.write"));
/**
 * Twitter ads sandbox client with all rights (read/write)
 */
class TwitterAdsSandbox extends client_ads_sandbox_write_1.default {
    constructor() {
        super(...arguments);
        this._prefix = globals_1.API_ADS_SANDBOX_PREFIX;
    }
    /**
     * Get a client with read/write rights.
     */
    get readWrite() {
        return this;
    }
}
exports.TwitterAdsSandbox = TwitterAdsSandbox;
exports.default = TwitterAdsSandbox;
