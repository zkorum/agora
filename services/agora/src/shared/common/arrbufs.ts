/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MOFIFY THIS FILE DIRECTLY! **** **/
import * as uint8arrays from "uint8arrays";

import { fromString } from "uint8arrays/from-string";

// Copyright ts-odd team
// Apache v2 License
// Extracted from: https://github.com/oddsdk/ts-odd/tree/f90bde37416d9986d1c0afed406182a95ce7c1d7
export const equal = (aBuf: ArrayBuffer, bBuf: ArrayBuffer): boolean => {
    const a = new Uint8Array(aBuf);
    const b = new Uint8Array(bBuf);
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

export function anyToUint8Array(data: unknown): Uint8Array {
    return uint8arrays.fromString(JSON.stringify(data));
}

export function uint8ArrayToJSON(data: Uint8Array): object {
     
    return JSON.parse(uint8arrays.toString(data));
}

export function stringToBytes(data: string): Uint8Array {
    return fromString(data);
}
