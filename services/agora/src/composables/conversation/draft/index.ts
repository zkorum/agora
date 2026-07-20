/**
 * Barrel file for conversation draft composables and types
 */

// Main composable
export type { UseConversationDraftReturn } from "./useConversationDraft";
export { useConversationDraft } from "./useConversationDraft";

// Types
export type {
  ConversationDraft,
  ConversationFormState,
  ConversationImportSettings,
  ConversationImportType,
  FieldValidationState,
  MutationResult,
  PostAsSettings,
  UseConversationDraftConfig,
  ValidationErrorField,
  ValidationResult,
  ValidationState,
} from "./conversationDraft.types";

// Utility functions
export {
  areConversationMultilingualSettingsEqual,
  createEmptyDraft,
  hasContentThatWouldBeCleared,
  resolveSelectedOrganizationSlug,
} from "./conversationDraft.utils";

// Schemas and validation
export type { SerializableConversationDraft } from "./conversationDraft.schema";
export {
  VALIDATION_CONSTANTS,
  zodConversationImportSettings,
  zodConversationImportType,
  zodCsvFileMetadata,
  zodCsvFileMetadataSet,
  zodPolisUrlValidation,
  zodPostAsSettings,
  zodSerializableConversationDraft,
  zodTitleValidation,
} from "./conversationDraft.schema";
