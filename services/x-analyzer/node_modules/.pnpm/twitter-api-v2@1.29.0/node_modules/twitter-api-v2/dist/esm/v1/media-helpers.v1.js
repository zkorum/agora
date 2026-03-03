import * as fs from 'fs';
import { safeDeprecationWarning } from '../helpers';
import { EUploadMimeType } from '../types';
export async function readFileIntoBuffer(file) {
    const handle = await getFileHandle(file);
    if (typeof handle === 'number') {
        return new Promise((resolve, reject) => {
            fs.readFile(handle, (err, data) => {
                if (err) {
                    return reject(err);
                }
                resolve(data);
            });
        });
    }
    else if (handle instanceof Buffer) {
        return handle;
    }
    else {
        return handle.readFile();
    }
}
export function getFileHandle(file) {
    if (typeof file === 'string') {
        return fs.promises.open(file, 'r');
    }
    else if (typeof file === 'number') {
        return file;
    }
    else if (typeof file === 'object' && !(file instanceof Buffer)) {
        return file;
    }
    else if (!(file instanceof Buffer)) {
        throw new Error('Given file is not valid, please check its type.');
    }
    else {
        return file;
    }
}
export async function getFileSizeFromFileHandle(fileHandle) {
    // Get the file size
    if (typeof fileHandle === 'number') {
        const stats = await new Promise((resolve, reject) => {
            fs.fstat(fileHandle, (err, stats) => {
                if (err)
                    reject(err);
                resolve(stats);
            });
        });
        return stats.size;
    }
    else if (fileHandle instanceof Buffer) {
        return fileHandle.length;
    }
    else {
        return (await fileHandle.stat()).size;
    }
}
export function getMimeType(file, type, mimeType) {
    if (typeof mimeType === 'string') {
        return mimeType;
    }
    else if (typeof file === 'string' && !type) {
        return getMimeByName(file);
    }
    else if (typeof type === 'string') {
        return getMimeByType(type);
    }
    throw new Error('You must specify type if file is a file handle or Buffer.');
}
function getMimeByName(name) {
    if (name.endsWith('.jpeg') || name.endsWith('.jpg'))
        return EUploadMimeType.Jpeg;
    if (name.endsWith('.png'))
        return EUploadMimeType.Png;
    if (name.endsWith('.webp'))
        return EUploadMimeType.Webp;
    if (name.endsWith('.gif'))
        return EUploadMimeType.Gif;
    if (name.endsWith('.mpeg4') || name.endsWith('.mp4'))
        return EUploadMimeType.Mp4;
    if (name.endsWith('.mov') || name.endsWith('.mov'))
        return EUploadMimeType.Mov;
    if (name.endsWith('.srt'))
        return EUploadMimeType.Srt;
    safeDeprecationWarning({
        instance: 'TwitterApiv1ReadWrite',
        method: 'uploadMedia',
        problem: 'options.mimeType is missing and filename couldn\'t help to resolve MIME type, so it will fallback to image/jpeg',
        resolution: 'If you except to give filenames without extensions, please specify explicitlty the MIME type using options.mimeType',
    });
    return EUploadMimeType.Jpeg;
}
function getMimeByType(type) {
    safeDeprecationWarning({
        instance: 'TwitterApiv1ReadWrite',
        method: 'uploadMedia',
        problem: 'you\'re using options.type',
        resolution: 'Remove options.type argument and migrate to options.mimeType which takes the real MIME type. ' +
            'If you\'re using type=longmp4, add options.longVideo alongside of mimeType=EUploadMimeType.Mp4',
    });
    if (type === 'gif')
        return EUploadMimeType.Gif;
    if (type === 'jpg')
        return EUploadMimeType.Jpeg;
    if (type === 'png')
        return EUploadMimeType.Png;
    if (type === 'webp')
        return EUploadMimeType.Webp;
    if (type === 'srt')
        return EUploadMimeType.Srt;
    if (type === 'mp4' || type === 'longmp4')
        return EUploadMimeType.Mp4;
    if (type === 'mov')
        return EUploadMimeType.Mov;
    return type;
}
export function getMediaCategoryByMime(name, target) {
    if (name === EUploadMimeType.Mp4 || name === EUploadMimeType.Mov)
        return target === 'tweet' ? 'TweetVideo' : 'DmVideo';
    if (name === EUploadMimeType.Gif)
        return target === 'tweet' ? 'TweetGif' : 'DmGif';
    if (name === EUploadMimeType.Srt)
        return 'Subtitles';
    else
        return target === 'tweet' ? 'TweetImage' : 'DmImage';
}
export function sleepSecs(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}
export async function readNextPartOf(file, chunkLength, bufferOffset = 0, buffer) {
    if (file instanceof Buffer) {
        const rt = file.slice(bufferOffset, bufferOffset + chunkLength);
        return [rt, rt.length];
    }
    if (!buffer) {
        throw new Error('Well, we will need a buffer to store file content.');
    }
    let bytesRead;
    if (typeof file === 'number') {
        bytesRead = await new Promise((resolve, reject) => {
            fs.read(file, buffer, 0, chunkLength, bufferOffset, (err, nread) => {
                if (err)
                    reject(err);
                resolve(nread);
            });
        });
    }
    else {
        const res = await file.read(buffer, 0, chunkLength, bufferOffset);
        bytesRead = res.bytesRead;
    }
    return [buffer, bytesRead];
}
