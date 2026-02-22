export function isValidPolisUrl(url: string): boolean {
    try {
        const { conversationId, reportId } = extractPolisIdFromUrl(url);
        return conversationId !== undefined || reportId !== undefined;
    } catch (e) {
        console.error(e);
        return false;
    }
}

interface PolisId {
    conversationId?: string;
    reportId?: string;
}

export function extractPolisIdFromUrl(url: string): PolisId {
    if (!url.trim()) {
        throw new Error("Polis URL is empty");
    }
    const urlObject = new URL(url); // can throw
    const hostname = urlObject.hostname;
    if (
        hostname !== "pol.is" &&
        !hostname.endsWith(".pol.is") &&
        hostname !== "deepgov.org" &&
        !hostname.endsWith(".deepgov.org")
    ) {
        throw new Error(`Polis URL ${url} has an incorrect hostname`);
    }

    // e.g. https://pol.is/384anuzye9 or https://pol.is/report/r32beaksmhwesyum6kaur
    // e.g. https://polis.deepgov.org/conversation/2hdcecwjyc
    const pathParts = urlObject.pathname.split("/").filter((p) => p); // filter out empty strings
    if (pathParts.length === 1) {
        if (urlObject.hostname.endsWith("deepgov.org")) {
            throw new Error(`Deepgov urls start with /conversation`);
        }
        return { conversationId: pathParts[0] }; // e.g. /384anuzye9
    }
    if (pathParts.length === 2) {
        if (pathParts[0] === "report") {
            return { reportId: pathParts[1] }; // e.g. /report/r32beaksmhwesyum6kaur
        }
        if (pathParts[0] === "conversation") {
            return { conversationId: pathParts[1] }; // e.g. conversation/2hdcecwjyc
        }
    }
    if (pathParts.length === 3 && pathParts[1] === "report") {
        // maybe deepgov?
        return { reportId: pathParts[2] }; // e.g. conversation/report/r32beaksmhwesyum6kaur
    }
    throw new Error(`Polis URL ${url} has an incorrect pathname`);
}
