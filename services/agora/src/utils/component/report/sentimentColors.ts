// Sentiment color constants for use in <template> and <script> blocks.
//
// SCSS variables ($sentiment-positive, etc. in quasar.variables.scss) are
// compile-time only — available in <style> blocks but not in templates or
// script at runtime. For inline :style bindings and component props like
// :title-color, we need JS constants.
//
// Keep these values in sync with quasar.variables.scss.

export const SENTIMENT_POSITIVE = "#6b4eff";
export const SENTIMENT_NEUTRAL = "#cdcbd3";
export const SENTIMENT_NEGATIVE = "#ffb323";
export const SENTIMENT_NEGATIVE_TEXT = "#a05e03";
export const SENTIMENT_MIXED = "#b58091";
export const SENTIMENT_EMPTY = "#e9e9f1";
