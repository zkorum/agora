"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("../globals");
const client_ads_read_1 = __importDefault(require("./client.ads.read"));
/**
 * Base Twitter ads client with read/write rights.
 */
class TwitterAdsReadWrite extends client_ads_read_1.default {
    constructor() {
        super(...arguments);
        this._prefix = globals_1.API_ADS_PREFIX;
    }
    /**
     * Get a client with only read rights.
     */
    get readOnly() {
        return this;
    }
}
exports.default = TwitterAdsReadWrite;
