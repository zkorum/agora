export function isValidPolisUrl(url: string): boolean {
    if (!url.trim()) {
        return false;
    }

    try {
        const urlObject = new URL(url);
        if (
            urlObject.hostname !== "pol.is" &&
            !urlObject.hostname.endsWith(".pol.is")
        ) {
            return false;
        }

        // e.g. https://pol.is/384anuzye9 or https://pol.is/report/r32beaksmhwesyum6kaur
        const pathParts = urlObject.pathname.split("/").filter((p) => p); // filter out empty strings
        if (pathParts.length === 1) {
            return true; // e.g. /384anuzye9
        }
        if (pathParts.length === 2 && pathParts[0] === "report") {
            return true; // e.g. /report/r32beaksmhwesyum6kaur
        }
        return false;
    } catch {
        return false;
    }
}
