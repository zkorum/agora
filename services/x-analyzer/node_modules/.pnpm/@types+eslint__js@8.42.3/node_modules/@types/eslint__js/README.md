# Installation
> `npm install --save @types/eslint__js`

# Summary
This package contains type definitions for @eslint/js (https://github.com/eslint/eslint/tree/main/packages/js).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/eslint__js.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/eslint__js/index.d.ts)
````ts
import type { Linter } from "eslint";

declare const js: {
    readonly configs: {
        readonly recommended: { readonly rules: Readonly<Linter.RulesRecord> };
        readonly all: { readonly rules: Readonly<Linter.RulesRecord> };
    };
};

export = js;

````

### Additional Details
 * Last updated: Mon, 06 Nov 2023 22:41:05 GMT
 * Dependencies: [@types/eslint](https://npmjs.com/package/@types/eslint)

# Credits
These definitions were written by [Matt Wilkinson](https://github.com/matwilko).
