export function httpUrlToResourcePointer(url: URL | string): {
    scheme: string;
    hierPart: string;
} {
    let urlVal: URL;
    if (url instanceof URL) {
        urlVal = url;
    } else {
        urlVal = new URL(url);
    }
    const scheme = "https";
    const hierPart = `//agoracitizen.app${urlVal.pathname}`;
    return { scheme, hierPart };
}

export function httpPathnameToResourcePointer(pathname: string): {
    scheme: string;
    hierPart: string;
} {
    const scheme = "https";
    const hierPart = `//agoracitizen.app${pathname}`;
    return { scheme, hierPart };
}

export function httpMethodToAbility(method: string) {
    return { namespace: "http", segments: [method.toUpperCase()] };
}
