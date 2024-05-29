import * as archiver from 'archiver';
import * as unzipper from 'unzipper';
import * as fs from 'fs';
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

/**
 * Extract a specific file from a zip archive as a buffer using streams
 * @param zipFilePath The path to the zip file
 * @param fileName The name of the file to extract (e.g., ".signature")
 * @returns A promise that resolves to a buffer containing the file contents
 */
export const extractFileAsBufferUsingStreams = async (zipFilePath: string, fileName: string): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
      const fileBuffers: Buffer[] = [];
      
      fs.createReadStream(zipFilePath)
        .pipe(unzipper.Parse())
        .on('entry', function (entry) {
          const entryPath = entry.path;
          if (entryPath === fileName) {
            entry.on('data', chunk => fileBuffers.push(chunk));
            entry.on('end', () => resolve(Buffer.concat(fileBuffers)));
          } else {
            entry.autodrain();
          }
        })
        .on('error', reject)
        .on('finish', () => {
          if (fileBuffers.length === 0) {
            reject(new Error(`File ${fileName} not found in ${zipFilePath}`));
          }
        });
    });
  };