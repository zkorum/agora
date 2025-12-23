/**
 * PrimeVue Global Component Type Declarations
 *
 * This file registers the PrimeVue components that are globally registered
 * in src/boot/primevue.ts with their custom "Prime" prefix names.
 *
 * This enables TypeScript to recognize these components in templates
 * when using strictTemplates mode.
 *
 * ---
 *
 * ## strictTemplates and Third-Party Library v-model Type Mismatches
 *
 * When using `vueCompilerOptions.strictTemplates: true` in tsconfig.json,
 * vue-tsc performs strict type checking on component props including v-model bindings.
 *
 * Third-party component libraries (Quasar, PrimeVue, MazUI) often define broad
 * v-model types to support multiple use cases:
 *
 * - **Quasar q-input**: `modelValue: string | number | null` (supports text/number inputs)
 * - **PrimeVue DatePicker**: `modelValue: Date | Date[] | null | undefined` (supports single/range/multiple)
 * - **PrimeVue InputText**: `modelValue: string | undefined`
 * - **MazPhoneNumberInput**: `modelValue: T | undefined`
 *
 * When we use these components with narrower types (e.g., `ref<string>("")`),
 * vue-tsc reports type mismatches even though the code is functionally correct.
 *
 * ### Solution: `@vue-expect-error` directive comments
 *
 * Use HTML comments before the component to suppress these known false positives:
 *
 * ```html
 * <!-- @vue-expect-error Quasar q-input types modelValue as string | number | null -->
 * <q-input v-model="myStringRef" />
 * ```
 *
 * Available directives (from Vue Language Tools):
 * - `<!-- @vue-expect-error [reason] -->` - Suppress error; warns if no error (preferred)
 * - `<!-- @vue-ignore -->` - Suppress error silently
 * - `<!-- @vue-skip -->` - Skip type checking entirely for the node
 *
 * Use `@vue-expect-error` so you'll be notified if the library fixes its types.
 *
 * See: https://github.com/vuejs/language-tools/wiki/Directive-Comments
 */
declare module "vue" {
  export interface GlobalComponents {
    PrimeButton: typeof import("primevue/button")["default"];
    PrimeCard: typeof import("primevue/card")["default"];
    PrimeChip: typeof import("primevue/chip")["default"];
    PrimeDatePicker: typeof import("primevue/datepicker")["default"];
    PrimeSelect: typeof import("primevue/select")["default"];
    PrimeInputOtp: typeof import("primevue/inputotp")["default"];
    PrimeInputText: typeof import("primevue/inputtext")["default"];
    PrimeIconField: typeof import("primevue/iconfield")["default"];
    PrimeInputIcon: typeof import("primevue/inputicon")["default"];
    PrimeFileUpload: typeof import("primevue/fileupload")["default"];
    PrimeProgressSpinner: typeof import("primevue/progressspinner")["default"];
    PrimeMessage: typeof import("primevue/message")["default"];
    PrimeTag: typeof import("primevue/tag")["default"];
  }
}

export {};
