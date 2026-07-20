/**
 * TypeScript type definitions for conversation draft management
 *
 * This module contains all interfaces and types used across:
 * - useConversationDraft composable
 * - newConversationDrafts store
 * - Conversation form components
 */

import type {
  ConversationMultilingualSetting,
  ConversationTypeConfig,
  EventSlug,
  ExternalSourceConfig,
  ParticipationMode,
  PreferredOpinionGroupCount,
  SurveyConfig,
} from "src/shared/types/zod";

// ============================================================================
// Draft Data Structures
// ============================================================================

/**
 * Settings for posting as an organization
 */
export interface PostAsSettings {
  /** Whether to publish this post on behalf of an organization */
  postAsOrganization: boolean;
  /** The organization slug, or a legacy display name until the persisted draft is normalized. */
  organizationName: string;
}

/**
 * Settings for importing conversations
 */
export interface ConversationImportSettings {
  /** How this conversation is being imported (null for manual creation) */
  importType: ConversationImportType;
  /** The Polis conversation URL (only relevant for 'polis-url' type) */
  polisUrl: string;
  /** Metadata for uploaded CSV files (only relevant for 'csv-import' type) */
  csvFileMetadata: {
    summary: { name: string; size: number } | null;
    comments: { name: string; size: number } | null;
    votes: { name: string; size: number } | null;
  };
}

/**
 * Represents a draft of a conversation post with all its configuration options
 */
export interface ConversationDraftBase {
  // Basic Content
  /** The title/subject of the conversation post */
  title: string;
  /** The main content/body text of the conversation post */
  content: string;
  /** The visible plain text emitted by the rich-text editor for the body */
  contentPlainText: string;
  /** Additional target languages and Dynamic Translation activation. */
  multilingualSetting: ConversationMultilingualSetting;
  /** Listed project selected for this conversation; undefined means the hidden default project. */
  selectedProjectSlug?: string;
  /** Whether the conversation should use the selected project's language settings. */
  inheritProjectLanguages: boolean;
  /** Initial opinion responses to seed the conversation */
  seedOpinions: string[];

  // Conversation Type
  /** The broad conversation family. Ranking subtypes are represented by rankingMode. */
  conversationType: ConversationTypeConfig["conversationType"];
  /** Ranking subtype; currently only "bws" is supported. */
  rankingMode?: Extract<ConversationTypeConfig, { conversationType: "ranking" }>["rankingMode"];

  // Publishing Options
  postAs: PostAsSettings;

  // Privacy and Advanced Settings
  /** Whether this is a private conversation (enables advanced settings) */
  isPrivate: boolean;
  /** Controls the participation mode for this conversation (applies to both public and private conversations) */
  participationMode: ParticipationMode;

  // Event Ticket Verification
  /** If set, requires users to verify ownership of the specified event ticket. If undefined, no verification required. */
  requiresEventTicket?: EventSlug;

  // AI labeling
  aiLabelingEnabled: boolean;

  // Facilitator analysis preference
  preferredOpinionGroupCount: PreferredOpinionGroupCount;

  // External Source (GitHub integration for MaxDiff)
  externalSourceConfig: ExternalSourceConfig | null;

  // Survey configuration
  surveyConfig: SurveyConfig | null;

  // Import Settings
  importSettings: ConversationImportSettings;
}

export type ConversationDraft = Omit<
  ConversationDraftBase,
  "conversationType" | "rankingMode"
> &
  ConversationTypeConfig;

/**
 * Type for conversation import method
 */
export type ConversationImportType = "polis-url" | "csv-import" | null;

// ============================================================================
// Composable Configuration
// ============================================================================

/**
 * Configuration for the useConversationDraft composable
 */
export interface UseConversationDraftConfig {
  /** Whether to sync draft changes to the Pinia store for persistence */
  syncToStore: boolean;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation state for a single field
 */
export interface FieldValidationState {
  isValid: boolean;
  error: string;
  showError: boolean;
}

/**
 * Comprehensive validation state for all form fields
 */
export interface ValidationState {
  title: FieldValidationState;
  body: FieldValidationState;
  polisUrl: FieldValidationState;
}

/**
 * Field identifiers for validation errors
 */
export type ValidationErrorField = "title" | "body" | "polisUrl";

/**
 * Mutation result interface for consistent error handling
 */
export interface MutationResult {
  success: boolean;
  error?: string;
}

/**
 * Result of validation checks for proceeding to review page
 */
export interface ValidationResult {
  isValid: boolean;
  errors: {
    title?: string;
    body?: string;
    polisUrl?: string;
  };
  firstErrorField?: ValidationErrorField;
}

// ============================================================================
// Data Transfer Types
// ============================================================================

/**
 * Form state data structure (for loading/exporting draft data)
 */
export interface ConversationFormState {
  // Basic content
  title: string;
  content: string;
  contentPlainText: string;
  multilingualSetting: ConversationMultilingualSetting;
  selectedProjectSlug?: string;
  inheritProjectLanguages: boolean;

  // Privacy settings
  isPrivate: boolean;
  participationMode: ParticipationMode;
  requiresEventTicket?: EventSlug;
  aiLabelingEnabled: boolean;
  preferredOpinionGroupCount: PreferredOpinionGroupCount;

  // Survey configuration
  surveyConfig: SurveyConfig | null;
}
