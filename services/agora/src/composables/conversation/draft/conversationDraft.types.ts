/**
 * TypeScript type definitions for conversation draft management
 *
 * This module contains all interfaces and types used across:
 * - useConversationDraft composable
 * - newConversationDrafts store
 * - Conversation form components
 */

import type { EventSlug } from "src/shared/types/zod";

// ============================================================================
// Draft Data Structures
// ============================================================================

/**
 * Settings for posting as an organization
 */
export interface PostAsSettings {
  /** Whether to publish this post on behalf of an organization */
  postAsOrganization: boolean;
  /** The name of the organization (only relevant if postAsOrganization is true) */
  organizationName: string;
}

/**
 * Advanced settings for private conversations
 * Only relevant when the conversation is private
 */
export interface PrivateConversationSettings {
  /** Whether to automatically convert this conversation on a specific date */
  hasScheduledConversion: boolean;
  /** The target date for automatic conversion */
  conversionDate: Date;
}

/**
 * Polling configuration for the conversation
 */
export interface PollSettings {
  /** Whether this conversation includes a poll */
  enabled: boolean;
  /** List of poll options */
  options: string[];
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
export interface ConversationDraft {
  // Basic Content
  /** The title/subject of the conversation post */
  title: string;
  /** The main content/body text of the conversation post */
  content: string;
  /** Initial opinion responses to seed the conversation */
  seedOpinions: string[];

  // Polling Configuration
  poll: PollSettings;

  // Publishing Options
  postAs: PostAsSettings;

  // Privacy and Advanced Settings
  /** Whether this is a private conversation (enables advanced settings) */
  isPrivate: boolean;
  /** Whether users must be logged in to participate (applies to both public and private conversations) */
  requiresLogin: boolean;
  /** Advanced settings for private conversations (only relevant when isPrivate is true) */
  privateConversationSettings: PrivateConversationSettings;

  // Event Ticket Verification
  /** If set, requires users to verify ownership of the specified event ticket. If undefined, no verification required. */
  requiresEventTicket?: EventSlug;

  // Import Settings
  importSettings: ConversationImportSettings;
}

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
  poll: FieldValidationState;
  polisUrl: FieldValidationState;
}

/**
 * Field identifiers for validation errors
 */
export type ValidationErrorField = "title" | "poll" | "body" | "polisUrl";

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
    poll?: string;
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

  // Poll configuration
  pollEnabled: boolean;
  pollOptions: string[];

  // Privacy settings
  isPrivate: boolean;
  requiresLogin: boolean;
  requiresEventTicket?: EventSlug;

  // Private conversation settings
  privateConversationSettings: PrivateConversationSettings;
}
