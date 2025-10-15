import { useDateFormat } from "@vueuse/core";

/**
 * Formats a date using a standard format across the application
 * Uses @vueuse/core's useDateFormat for consistent formatting
 * @param date - The date to format
 * @returns Formatted date string in "MMM D, YYYY hh:mm A z" format (12-hour with timezone)
 */
export function formatDateTime(date: Date): string {
  return useDateFormat(date, "MMM D, YYYY hh:mm A").value;
}

/**
 * Formats a file size in bytes to a human-readable format
 * @param bytes - The file size in bytes
 * @returns Formatted file size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const formattedSize = Math.round((bytes / Math.pow(k, i)) * 100) / 100;
  return `${formattedSize} ${sizes[i]}`;
}

/**
 * Checks if a URL has expired based on the expiration date
 * @param expiresAt - The expiration date
 * @returns True if the URL has expired, false otherwise
 */
export function isUrlExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() < Date.now();
}
