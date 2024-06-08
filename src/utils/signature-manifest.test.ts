import * as fs from "node:fs/promises";
import { SIGNATURE_MANIFEST_FILE_NAME } from "./constants";
import { download } from "./download";
import { generateManifest, verifyManifest } from "./signature-manifest";
import { extractFileAsBufferUsingStreams } from "./zip";
import { ExtensionSignatureVerificationError } from "./errors";

jest.setTimeout(40_000);

describe("signatureManifestTest", () => {
    it("should be able to generate a signature manifest file", async () => {
        const extensionDestination = await download(
            "https://ms-python.gallerycdn.vsassets.io/extensions/ms-python/python/2024.7.11511013/1717064437177/Microsoft.VisualStudio.Services.VSIXPackage",
            {},
        );
        const signatureArchivePath = await download(
            "https://ms-python.gallerycdn.vsassets.io/extensions/ms-python/python/2024.7.11511013/1717064437177/Microsoft.VisualStudio.Services.VsixSignature",
            { filename: "signature.sigzip" },
        );
        const expectedSignatureManifest = JSON.parse(
            (await extractFileAsBufferUsingStreams(signatureArchivePath, SIGNATURE_MANIFEST_FILE_NAME)).toString(
                "utf-8",
            ),
        );

        const generatedManifest = await generateManifest(extensionDestination);

        expect(generatedManifest).toEqual(expectedSignatureManifest);
        expect(verifyManifest(generatedManifest, extensionDestination)).resolves.toBe(true);

        // Clean up
        await fs.unlink(extensionDestination);
        await fs.unlink(signatureArchivePath);
    });

    it("should be able to validate an invalid manifest", async () => {
        const extensionDestination = await download(
            "https://ms-python.gallerycdn.vsassets.io/extensions/ms-python/python/2024.8.0/1717626840538/Microsoft.VisualStudio.Services.VSIXPackage",
            {},
        );
        const signatureArchivePath = await download(
            "https://ms-python.gallerycdn.vsassets.io/extensions/ms-python/python/2024.7.11511013/1717064437177/Microsoft.VisualStudio.Services.VsixSignature",
            { filename: "signature.sigzip" },
        );
        const incorrectSignatureManifest = JSON.parse(
            (await extractFileAsBufferUsingStreams(signatureArchivePath, SIGNATURE_MANIFEST_FILE_NAME)).toString(
                "utf-8",
            ),
        );

        expect(verifyManifest(incorrectSignatureManifest, extensionDestination)).resolves.toBe(false);

        // Clean up
        await fs.unlink(extensionDestination);
        await fs.unlink(signatureArchivePath);
    });

    it("should detect a malformed manifest", async () => {
        const extensionDestination = await download(
            "https://ms-python.gallerycdn.vsassets.io/extensions/ms-python/python/2024.8.0/1717626840538/Microsoft.VisualStudio.Services.VSIXPackage",
            {},
        );

        await expect(verifyManifest({ allSignatures: "totallyValid" } as any, extensionDestination)).rejects.toThrow(
            ExtensionSignatureVerificationError,
        );

        // Clean up
        await fs.unlink(extensionDestination);
    });
});
