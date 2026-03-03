import { TwitterApiV2Settings } from './settings';
export function sharedPromise(getter) {
    const sharedPromise = {
        value: undefined,
        promise: getter().then(val => {
            sharedPromise.value = val;
            return val;
        }),
    };
    return sharedPromise;
}
export function arrayWrap(value) {
    if (Array.isArray(value)) {
        return value;
    }
    return [value];
}
export function trimUndefinedProperties(object) {
    // Delete undefined parameters
    for (const parameter of Object.keys(object)) {
        if (object[parameter] === undefined) {
            delete object[parameter];
        }
    }
}
export function isTweetStreamV2ErrorPayload(payload) {
    // Is error only if 'errors' is present and 'data' does not exists
    return typeof payload === 'object'
        && 'errors' in payload
        && !('data' in payload);
}
export function hasMultipleItems(item) {
    if (Array.isArray(item) && item.length > 1) {
        return true;
    }
    return item.toString().includes(',');
}
const deprecationWarningsCache = new Set();
export function safeDeprecationWarning(message) {
    if (typeof console === 'undefined' || !console.warn || !TwitterApiV2Settings.deprecationWarnings) {
        return;
    }
    const hash = `${message.instance}-${message.method}-${message.problem}`;
    if (deprecationWarningsCache.has(hash)) {
        return;
    }
    const formattedMsg = `[twitter-api-v2] Deprecation warning: In ${message.instance}.${message.method}() call` +
        `, ${message.problem}.\n${message.resolution}.`;
    console.warn(formattedMsg);
    console.warn('To disable this message, import variable TwitterApiV2Settings from twitter-api-v2 and set TwitterApiV2Settings.deprecationWarnings to false.');
    deprecationWarningsCache.add(hash);
}
