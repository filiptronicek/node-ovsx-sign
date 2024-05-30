import { readZip } from "@vscode/vsce/out/zip";
import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";

type VsixSignatureManifest = {
    package: {
        size: number;
        digests: {
            sha256: string;
        };
    };
    entries: {
        [key: string]: {
            size: number;
            digests: {
                sha256: string;
            };
        };
    };
};

/**
 * @returns a sha256 hash of the file
 */
const fileSha256 = async (file: Buffer): Promise<string> => {
    return new Promise((resolve, reject) => {
        try {
            const hash = createHash("sha256");
            hash.update(file);
            const digest = hash.digest("hex");
            resolve(digest);
        } catch (error) {
            reject(error);
        }
    });
};

const toBase64 = (string: string): string => Buffer.from(string).toString("base64");

export const generateSignatureManifest = async (vsixFilePath: string): Promise<VsixSignatureManifest> => {
    const extensionPackage = await fs.readFile(vsixFilePath);
    const extensionPackageContentsDetails: Map<string, Buffer> = await readZip(vsixFilePath, (entry) => true);

    const entries: VsixSignatureManifest["entries"] = {};
    for (const [entryPath, entryContent] of extensionPackageContentsDetails.entries()) {
        const entrySize = entryContent.length;
        const entrySha256 = await fileSha256(entryContent);
        entries[toBase64(entryPath)] = {
            size: entrySize,
            digests: {
                sha256: entrySha256,
            },
        };
    }

    return {
        package: {
            size: extensionPackage.length,
            digests: {
                sha256: await fileSha256(extensionPackage),
            },
        },
        entries,
    };
};
