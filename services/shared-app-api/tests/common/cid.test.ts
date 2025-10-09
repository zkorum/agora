import { describe, test } from "@jest/globals";
import { expect } from "@jest/globals";
import { cid } from "../../src/common/index.js";

describe("CID length", () => {
    test("generate-dev-keys", async () => {
        const context = {
            val: "some value",
            obj: {
                other: "another value",
                chandler: 11,
                bing: 12,
                joey: 13,
                tribiani: 16,
            },
            rachel: "rach",
            greene: "gr",
        };
        const otherContext = {
            a: "a",
            b: {
                c: "c",
                d: {
                    e: "e",
                    f: {
                        g: "g",
                        h: {
                            i: "i",
                        },
                    },
                },
            },
        };

        const contextStr = JSON.stringify(context); // this would be unnecessary for CIDv1 but, we re-create the obj in the backend, so without stringification two JSON objects may be different even though they represent the same data.
        const cidStr = await cid.toEncodedCID(contextStr);
        const otherContextStr = JSON.stringify(otherContext); // this would be unnecessary for CIDv1 but, we re-create the obj in the backend, so without stringification two JSON objects may be different even though they represent the same data.
        const otherCIDStr = await cid.toEncodedCID(otherContextStr);
        expect(cidStr.length).toEqual(61); // fixed length is useful for database column type
        expect(cidStr.length).toEqual(otherCIDStr.length);
    });
});
