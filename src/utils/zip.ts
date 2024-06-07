import * as archiver from "archiver";
import * as fs from "node:fs";
import { Readable, Writable } from "node:stream";
import * as unzipper from "unzipper";
import { Entry, open, ZipFile } from "yauzl";

export const zipBuffers = async (files: { filename: string; buffer: Buffer }[]): Promise<Buffer> => {
    return new Promise<Buffer>((resolve, reject) => {
        const archive = archiver.default("zip", {
            zlib: { level: 9 },
        });

        const buffers: Buffer[] = [];
        const writableStream = new Writable({
            write(chunk, _, callback) {
                buffers.push(chunk);
                callback();
            },
        });

        writableStream.on("finish", () => {
            resolve(Buffer.concat(buffers));
        });

        archive.on("error", (err: Error) => {
            reject(err);
        });

        archive.pipe(writableStream);

        files.forEach((file) => {
            archive.append(file.buffer, { name: file.filename });
        });

        archive.finalize();
    });
};

/**
 * Extract a specific file from a zip archive as a buffer using streams
 * @param zipFilePath The path to the zip file
 * @param fileName The name of the file to extract (e.g., ".signature.sig")
 * @returns A promise that resolves to a buffer containing the file contents
 */
export const extractFileAsBufferUsingStreams = async (zipFilePath: string, fileName: string): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const fileBuffers: Buffer[] = [];

        fs.createReadStream(zipFilePath)
            .pipe(unzipper.Parse())
            .on("entry", function (entry) {
                const entryPath = entry.path;
                if (entryPath === fileName) {
                    entry.on("data", (chunk) => fileBuffers.push(chunk));
                    entry.on("end", () => resolve(Buffer.concat(fileBuffers)));
                } else {
                    entry.autodrain();
                }
            })
            .on("error", reject)
            .on("finish", () => {
                if (fileBuffers.length === 0) {
                    reject(new Error(`File ${fileName} not found in ${zipFilePath}`));
                }
            });
    });
};

async function bufferStream(stream: Readable): Promise<Buffer> {
    return await new Promise((resolve, reject) => {
        const buffers: Buffer[] = [];
        stream.on("data", (buffer) => buffers.push(buffer));
        stream.once("error", reject);
        stream.once("end", () => resolve(Buffer.concat(buffers)));
    });
}

// Modified version of https://github.com/microsoft/vscode-vsce/blob/fd9a2627e29c031829e550b9bde2ce2282d99a3d/src/zip.ts#L15
// Changes: removed the `filter` parameter, renamed some variables and prevented returning lowercase keys
export async function readZip(packagePath: string): Promise<Map<string, Buffer>> {
    const zipfile = await new Promise<ZipFile>((c, e) =>
        open(packagePath, { lazyEntries: true }, (err, zipfile) => (err ? e(err) : c(zipfile!))),
    );

    return await new Promise((resolve, reject) => {
        const result = new Map<string, Buffer>();

        zipfile.once("close", () => resolve(result));

        zipfile.readEntry();
        zipfile.on("entry", (entry: Entry) => {
            const name = entry.fileName;

            zipfile.openReadStream(entry, (err, stream) => {
                if (err) {
                    zipfile.close();
                    return reject(err);
                }

                bufferStream(stream!).then((buffer) => {
                    result.set(name, buffer);
                    zipfile.readEntry();
                });
            });
        });
    });
}
