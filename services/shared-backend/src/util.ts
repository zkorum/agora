/**
 * Utility functions for shared-backend
 */

/**
 * Get current timestamp with milliseconds set to zero
 *
 * This ensures consistent timestamp precision across database operations
 */
export function nowZeroMs(): Date {
    const now = new Date();
    now.setMilliseconds(0);
    return now;
}
