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

interface IsUserRegisteredProps {
    nullifier: string | null | undefined;
    phoneHash: string | null | undefined;
}

interface IsUserLoggedInProps {
    now: Date;
    sessionExpiry: Date;
}

export function isUserRegistered({
    nullifier,
    phoneHash,
}: IsUserRegisteredProps): boolean {
    return (
        (nullifier !== undefined && nullifier !== null) ||
        (phoneHash !== null && phoneHash !== undefined)
    );
}

export function isUserLoggedIn({
    now,
    sessionExpiry,
}: IsUserLoggedInProps): boolean {
    return sessionExpiry > now;
}
