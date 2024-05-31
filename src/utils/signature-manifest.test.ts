import { generateSignatureManifest } from "./signature-manifest";
import * as fs from "node:fs/promises";
import { download } from "./download";
import { extractFileAsBufferUsingStreams } from "./zip";

jest.setTimeout(20_000);

describe("signatureManifestTest", () => {
    test("be able to generate a signature manifest file", async () => {
        const extensionDestination = await download("https://ms-python.gallerycdn.vsassets.io/extensions/ms-python/python/2024.7.11511013/1717064437177/Microsoft.VisualStudio.Services.VSIXPackage", {});
        const signatureArchivePath = await download("https://ms-python.gallerycdn.vsassets.io/extensions/ms-python/python/2024.7.11511013/1717064437177/Microsoft.VisualStudio.Services.VsixSignature", { filename: "signature.sigzip" });
        const expectedSignatureManifest = JSON.parse((await extractFileAsBufferUsingStreams(signatureArchivePath, ".signature.manifest")).toString("utf-8"));

        const generatedManifest = await generateSignatureManifest(extensionDestination);

        expect(generatedManifest).toEqual(expectedSignatureManifest);

        // Clean up
        await fs.unlink(extensionDestination);
        await fs.unlink(signatureArchivePath);
    });
});
