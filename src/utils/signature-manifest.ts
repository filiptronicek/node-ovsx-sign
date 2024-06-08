import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import { readZip } from "./zip";
import { z } from "zod";
import { ExtensionSignatureVerificationError } from "./errors";

const vsixSignatureManifestSchema = z.object({
    package: z.object({
        size: z.number(),
        digests: z.object({
            sha256: z.string(),
        }),
    }),
    entries: z.record(
        z.object({
            size: z.number(),
            digests: z.object({
                sha256: z.string(),
            }),
        }),
    ),
});
type VsixSignatureManifest = z.infer<typeof vsixSignatureManifestSchema>;

/**
 * @returns a sha256 hash of the file in base64
 */
const fileSha256 = async (file: Buffer): Promise<string> => {
    return new Promise((resolve, reject) => {
        try {
            const hash = createHash("sha256");
            hash.update(file);
            const digest = hash.digest("base64");
            resolve(digest);
        } catch (error) {
            reject(error);
        }
    });
};

const toBase64 = (string: string): string => Buffer.from(string).toString("base64");

export const generateManifest = async (vsixFilePath: string): Promise<VsixSignatureManifest> => {
    const extensionPackage = await fs.readFile(vsixFilePath);
    const extensionPackageContentsDetails: Map<string, Buffer> = await readZip(vsixFilePath);

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

export const verifyManifest = async (
    manifest: VsixSignatureManifest,
    extensionPackagePath: string,
): Promise<boolean> => {
    const { success: isManifestFormatValid } = vsixSignatureManifestSchema.safeParse(manifest);
    if (!isManifestFormatValid) {
        throw new ExtensionSignatureVerificationError(
            "SignatureManifestIsInvalid",
            true,
            "The signature manifest is malformed",
        );
    }

    const extensionPackage = await fs.readFile(extensionPackagePath);
    const extensionPackageContentsDetails: Map<string, Buffer> = await readZip(extensionPackagePath);

    if (manifest.package.size !== extensionPackage.length) {
        return false;
    }

    if (manifest.package.digests.sha256 !== (await fileSha256(extensionPackage))) {
        return false;
    }

    for (const [entryPath, entryContent] of extensionPackageContentsDetails.entries()) {
        const entrySize = entryContent.length;
        const entrySha256 = await fileSha256(entryContent);
        if (manifest.entries[toBase64(entryPath)]?.size !== entrySize) {
            throw new ExtensionSignatureVerificationError(
                "EntryIsTampered",
                true,
                "The entry size has been tampered with",
            );
        }
        if (manifest.entries[toBase64(entryPath)]?.digests.sha256 !== entrySha256) {
            throw new ExtensionSignatureVerificationError(
                "EntryIsTampered",
                true,
                "The entry content has been tampered with",
            );
        }
    }

    return true;
};
