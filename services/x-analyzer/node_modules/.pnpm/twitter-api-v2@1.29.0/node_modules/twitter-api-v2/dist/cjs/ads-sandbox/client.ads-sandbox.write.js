"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("../globals");
const client_ads_sandbox_read_1 = __importDefault(require("./client.ads-sandbox.read"));
/**
 * Base Twitter ads sandbox client with read/write rights.
 */
class TwitterAdsSandboxReadWrite extends client_ads_sandbox_read_1.default {
    constructor() {
        super(...arguments);
        this._prefix = globals_1.API_ADS_SANDBOX_PREFIX;
    }
    /**
     * Get a client with only read rights.
     */
    get readOnly() {
        return this;
    }
}
exports.default = TwitterAdsSandboxReadWrite;
