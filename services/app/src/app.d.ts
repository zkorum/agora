// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { SeoData } from "#lib/seo.js";

declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    interface PageData {
      seo?: SeoData;
    }
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
