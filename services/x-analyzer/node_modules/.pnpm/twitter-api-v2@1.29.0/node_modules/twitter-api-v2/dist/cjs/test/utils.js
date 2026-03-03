"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOAuth2AuthLink = exports.getOAuth2RequestClient = exports.getOAuth2UserClient = exports.getAppClient = exports.getAccessClient = exports.getAuthLink = exports.getRequestKeys = exports.getRequestClient = exports.sleepTest = exports.getUserKeys = exports.getUserClient = void 0;
const __1 = require("..");
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: __dirname + '/../../.env' });
/** User OAuth 1.0a client */
function getUserClient() {
    return new __1.TwitterApi({
        appKey: process.env.CONSUMER_TOKEN,
        appSecret: process.env.CONSUMER_SECRET,
        accessToken: process.env.OAUTH_TOKEN,
        accessSecret: process.env.OAUTH_SECRET,
    });
}
exports.getUserClient = getUserClient;
function getUserKeys() {
    return {
        appKey: process.env.CONSUMER_TOKEN,
        appSecret: process.env.CONSUMER_SECRET,
        accessToken: process.env.OAUTH_TOKEN,
        accessSecret: process.env.OAUTH_SECRET,
    };
}
exports.getUserKeys = getUserKeys;
async function sleepTest(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
exports.sleepTest = sleepTest;
/** User-unlogged OAuth 1.0a client */
function getRequestClient() {
    return new __1.TwitterApi({
        appKey: process.env.CONSUMER_TOKEN,
        appSecret: process.env.CONSUMER_SECRET,
    });
}
exports.getRequestClient = getRequestClient;
function getRequestKeys() {
    return {
        appKey: process.env.CONSUMER_TOKEN,
        appSecret: process.env.CONSUMER_SECRET,
    };
}
exports.getRequestKeys = getRequestKeys;
// Test auth 1.0a flow
function getAuthLink(callback) {
    return getRequestClient().generateAuthLink(callback);
}
exports.getAuthLink = getAuthLink;
async function getAccessClient(verifier) {
    const requestClient = new __1.TwitterApi({
        appKey: process.env.CONSUMER_TOKEN,
        appSecret: process.env.CONSUMER_SECRET,
        accessToken: process.env.OAUTH_TOKEN,
        accessSecret: process.env.OAUTH_SECRET,
    });
    const { client } = await requestClient.login(verifier);
    return client;
}
exports.getAccessClient = getAccessClient;
/** App OAuth 2.0 client */
function getAppClient() {
    let requestClient;
    if (process.env.BEARER_TOKEN) {
        requestClient = new __1.TwitterApi(process.env.BEARER_TOKEN);
        return Promise.resolve(requestClient);
    }
    else {
        requestClient = new __1.TwitterApi({
            appKey: process.env.CONSUMER_TOKEN,
            appSecret: process.env.CONSUMER_SECRET,
        });
        return requestClient.appLogin();
    }
}
exports.getAppClient = getAppClient;
/** OAuth 2.0 user-context client for testing features requiring user scopes (like email access) */
function getOAuth2UserClient() {
    if (!process.env.OAUTH2_ACCESS_TOKEN) {
        throw new Error('OAUTH2_ACCESS_TOKEN environment variable is required for OAuth 2.0 user-context authentication');
    }
    return new __1.TwitterApi(process.env.OAUTH2_ACCESS_TOKEN);
}
exports.getOAuth2UserClient = getOAuth2UserClient;
/** Get OAuth 2.0 client for generating auth links (requires CLIENT_ID and CLIENT_SECRET) */
function getOAuth2RequestClient() {
    return new __1.TwitterApi({
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
    });
}
exports.getOAuth2RequestClient = getOAuth2RequestClient;
/** Generate OAuth 2.0 auth link with email scope for testing */
function getOAuth2AuthLink(callback) {
    const client = getOAuth2RequestClient();
    return client.generateOAuth2AuthLink(callback, {
        scope: ['tweet.read', 'users.read', 'users.email', 'follows.read', 'offline.access'],
    });
}
exports.getOAuth2AuthLink = getOAuth2AuthLink;
