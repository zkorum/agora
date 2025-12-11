import { ref, computed } from "vue";
import type { Ref } from "vue";
import type { ValidateCsvResponse } from "src/shared/types/dto";
import { MAX_CSV_FILE_SIZE } from "src/shared-app-api/csvUpload";

export type FileType = "summary" | "comments" | "votes";
export type FileStatus = "pending" | "uploaded" | "validating" | "error";

export interface CsvFileState {
  file: Ref<File | null>;
  error: Ref<string>;
  validation: Ref<ValidateCsvResponse[keyof ValidateCsvResponse]>;
  status: Ref<FileStatus>;
  uploadFile: (file: File) => boolean;
  removeFile: () => void;
  setValidationResult: (
    result: ValidateCsvResponse[keyof ValidateCsvResponse]
  ) => void;
  setValidating: (isValidating: boolean) => void;
  isValid: () => boolean;
}

/**
 * Composable for managing a single CSV file's state and operations
 * Encapsulates file, error, and validation state with methods to manipulate them
 */
export function useCsvFile(_fileType: FileType): CsvFileState {
  const file = ref<File | null>(null);
  const error = ref<string>("");
  const validation =
    ref<ValidateCsvResponse[keyof ValidateCsvResponse]>(undefined);
  const isValidating = ref<boolean>(false);

  /**
   * Computed status based on current state
   */
  const status = computed<FileStatus>(() => {
    if (error.value) return "error";
    if (file.value && isValidating.value) return "validating";
    if (file.value) return "uploaded";
    return "pending";
  });

  /**
   * Upload a file and validate its size
   * Returns true if successful, false if file is too large
   */
  function uploadFile(newFile: File): boolean {
    // Validate file size
    if (newFile.size > MAX_CSV_FILE_SIZE) {
      return false; // Caller should handle size error
    }

    file.value = newFile;
    error.value = "";
    validation.value = undefined;
    return true;
  }

  /**
   * Remove the current file and reset state
   */
  function removeFile(): void {
    file.value = null;
    error.value = "";
    validation.value = undefined;
    isValidating.value = false;
  }

  /**
   * Set validation result from backend
   */
  function setValidationResult(
    result: ValidateCsvResponse[keyof ValidateCsvResponse]
  ): void {
    validation.value = result;

    if (result && !result.isValid) {
      error.value = result.error || "Validation failed";
    } else {
      error.value = "";
    }
  }

  /**
   * Set validating state
   */
  function setValidating(validating: boolean): void {
    isValidating.value = validating;
  }

  /**
   * Check if file is valid (uploaded and passed validation)
   */
  function isValid(): boolean {
    if (!file.value) return false;
    if (error.value) return false;
    if (isValidating.value) return false;
    return validation.value?.isValid ?? false;
  }

  return {
    file,
    error,
    validation,
    status,
    uploadFile,
    removeFile,
    setValidationResult,
    setValidating,
    isValid,
  };
}
