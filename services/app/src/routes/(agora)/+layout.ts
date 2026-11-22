// Render the product shell on first request, then retain client-side navigation.
// Authenticated/browser-only data does not require disabling SSR for the route.
export const prerender = false;
export const ssr = true;
export const csr = true;
