/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MOFIFY THIS FILE DIRECTLY! **** **/
export function range(startAt: number, endAt: number): readonly number[] {
    if (endAt < startAt) {
        return [];
    }
    return [...Array(endAt - startAt + 1).keys()].map((i) => endAt - i);
}

export function removeUndefinedFields(obj: Record<string, unknown>) {
    Object.keys(obj).forEach((key) =>
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        obj[key] === undefined ? delete obj[key] : {},
    );
}

export function scopeWith(scope: string, withValue: string): string {
    return `${scope}.${withValue}`;
}

export function nowZeroMs(): Date {
    const now = new Date();
    now.setMilliseconds(0);
    return now;
}

export function calculatePercentage(numerator: number, denominator: number) {
    if (denominator <= 0) {
        return 0;
    }
    const percentage = (numerator / denominator) * 100;
    if (percentage >= 1) {
        return Math.round(percentage);
    }
    return percentage;
}
