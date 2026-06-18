interface ImagePathToUrlProps {
    imagePath: string | null;
    isFullImagePath: boolean;
    baseImageServiceUrl: string;
}

export function imagePathToUrl({
    imagePath,
    isFullImagePath,
    baseImageServiceUrl,
}: ImagePathToUrlProps): string | undefined {
    if (imagePath === null || imagePath.trim() === "") {
        return undefined;
    }

    return isFullImagePath ? imagePath : `${baseImageServiceUrl}${imagePath}`;
}
