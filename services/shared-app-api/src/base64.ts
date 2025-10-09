import * as uint8arrays from "uint8arrays";

export function base64Encode(value: Uint8Array): string {
    return uint8arrays.toString(value, "base64");
}

export function base64Decode(str: string): Uint8Array {
    return uint8arrays.fromString(str, "base64");
}

export function encode(value: Uint8Array): string {
    return uint8arrays.toString(value, "base64url");
}

export function decode(str: string): Uint8Array {
    return uint8arrays.fromString(str, "base64url");
}

export function decodeToStr(base64: string): string {
    return uint8arrays.toString(uint8arrays.fromString(base64, "base64url"));
}

export function encodeFromStr(str: string): string {
    return uint8arrays.toString(uint8arrays.fromString(str), "base64url");
}

export function urlDecode(base64: string): string {
    return decodeToStr(makeUrlUnsafe(base64));
}

export function urlEncode(str: string): string {
    return makeUrlSafe(encodeFromStr(str));
}

export function makeUrlSafe(a: string): string {
    return a.replace(/\//g, "_").replace(/\+/g, "-").replace(/=+$/, "");
}

export function makeUrlUnsafe(a: string): string {
    return a.replace(/_/g, "/").replace(/-/g, "+");
}
