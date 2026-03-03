"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_subclient_1 = __importDefault(require("../client.subclient"));
const globals_1 = require("../globals");
/**
 * Base Twitter ads client with only read rights.
 */
class TwitterAdsReadOnly extends client_subclient_1.default {
    constructor() {
        super(...arguments);
        this._prefix = globals_1.API_ADS_PREFIX;
    }
}
exports.default = TwitterAdsReadOnly;
