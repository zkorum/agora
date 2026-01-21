import { defineBoot } from "#q-app/wrappers";

export default defineBoot(() => {
  // 1. Object.hasOwn (Chrome 86 fix)
  // Spec-compliant shim for Object.hasOwn
  if (!Object.hasOwn) {
    Object.defineProperty(Object, "hasOwn", {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: function (obj: any, prop: PropertyKey) {
        return Object.prototype.hasOwnProperty.call(obj, prop);
      },
      configurable: true,
      writable: true,
    });
  }

  // 2. Array.prototype.at (Safari 14 / Chrome 86 fix)
  // Logic derived from external/zloirock/core-js/packages/core-js/modules/es.array.at.js (Lines 10-18)
  if (!Array.prototype.at) {
    Object.defineProperty(Array.prototype, "at", {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: function (index: any) {
        // 1. Let O be ? ToObject(this).
        if (this == null)
          throw new TypeError("Array.prototype.at called on null or undefined");
        const O = Object(this);

        // 2. Let len be ? LengthOfArrayLike(O).
        // Derived from external/zloirock/core-js/packages/core-js/internals/length-of-array-like.js (Lines 6-8)
        // and external/zloirock/core-js/packages/core-js/internals/to-length.js (Lines 6-10)
        const len = Number(O.length);
        const safeLen = Number.isNaN(len)
          ? 0
          : Math.min(Math.max(Math.trunc(len), 0), 9007199254740991); // 2^53 - 1

        // 3. Let relativeIndex be ? ToIntegerOrInfinity(index).
        // Derived from external/zloirock/core-js/packages/core-js/internals/to-integer-or-infinity.js (Lines 6-10)
        const n = Number(index);
        const relativeIndex = Number.isNaN(n) || n === 0 ? 0 : Math.trunc(n);

        // 4. Let k be relativeIndex >= 0 ? relativeIndex : len + relativeIndex.
        // Derived from external/zloirock/core-js/packages/core-js/modules/es.array.at.js (Line 15)
        const k = relativeIndex >= 0 ? relativeIndex : safeLen + relativeIndex;

        // 5. If k < 0 or k >= len, return undefined.
        // Derived from external/zloirock/core-js/packages/core-js/modules/es.array.at.js (Line 16)
        if (k < 0 || k >= safeLen) return undefined;

        // 6. Return ? Get(O, ! ToString(k)).
        return O[k];
      },
      configurable: true,
      writable: true,
    });
  }

  // 3. structuredClone (Critical for Chrome 86 / Safari 14)
  // WARNING: This is a lightweight fallback using JSON serialization.
  // It supports the simple data types used in store persistence (strings, bools, numbers, arrays, plain objects).
  // It does NOT support: Circular references, Map/Set, Date (converts to string), ArrayBuffer, or function transfer.
  // Full core-js implementation is >500 lines and too heavy to inline.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (globalThis as any).structuredClone !== "function") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).structuredClone = (val: any) => {
      return JSON.parse(JSON.stringify(val));
    };
  }
});
