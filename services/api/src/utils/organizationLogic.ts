interface ImagePathToUrlProps {
    imagePath: string;
    isFullImagePath: boolean;
    baseImageServiceUrl: string;
}

export function imagePathToUrl({
    imagePath,
    isFullImagePath,
    baseImageServiceUrl,
}: ImagePathToUrlProps): string {
    return isFullImagePath ? imagePath : `${baseImageServiceUrl}${imagePath}`;
}
