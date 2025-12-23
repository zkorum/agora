/**
 * Component Attribute Type Augmentations
 *
 * This file adds type declarations for common HTML attributes that can be
 * passed to Vue components via fallthrough attrs but aren't properly typed
 * in third-party component libraries (Quasar, PrimeVue, etc.).
 *
 * NOTE: Event handlers (onClick, onFocus, etc.) are intentionally NOT included
 * here because different libraries have incompatible event signatures, which
 * causes conflicts with strictFunctionTypes. Use @vue-expect-error comments
 * on individual components where needed instead.
 */
declare module "vue" {
  export interface ComponentCustomProps {
    // Accessibility attributes
    "aria-label"?: string;
    "aria-hidden"?: boolean | "true" | "false";
    "aria-labelledby"?: string;
    "aria-describedby"?: string;
    role?: string;

    // Common HTML attributes
    id?: string;
    autocomplete?: string;
    placeholder?: string;
    required?: boolean;
    textColor?: string;

    // Data attributes for third-party integrations (e.g., 1Password)
    "data-1p-ignore"?: boolean | string;
    data1pIgnore?: boolean | string;
  }
}

export {};
