import * as archiver from 'archiver';
import { Writable } from 'stream';

export const zipBuffers = async (files: { filename: string; buffer: Buffer }[]): Promise<Buffer> => {
    return new Promise<Buffer>((resolve, reject) => {
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        const buffers: Buffer[] = [];
        const writableStream = new Writable({
            write(chunk, _, callback) {
                buffers.push(chunk);
                callback();
            }
        });

        writableStream.on('finish', () => {
            resolve(Buffer.concat(buffers));
        });

        archive.on('error', (err: Error) => {
            reject(err);
        });

        archive.pipe(writableStream);

        files.forEach(file => {
            archive.append(file.buffer, { name: file.filename });
        });

        archive.finalize();
    });
}