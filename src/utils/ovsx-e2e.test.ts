import { PublicGalleryAPI } from "@vscode/vsce/out/publicgalleryapi";
import { ExtensionQueryFlags } from "azure-devops-node-api/interfaces/GalleryInterfaces";

import { verify } from "../";
import { EXTENSION_PACKAGE_NAME, SIGNED_ARCHIVE_NAME } from "./constants";
import { download } from "./download";
import { getMarketplaceEndpoint } from "./endpoints";

const openGalleryApi = new PublicGalleryAPI(`${getMarketplaceEndpoint()}/vscode`, "3.0-preview.1");
openGalleryApi.client["_allowRetries"] = true;
openGalleryApi.client["_maxRetries"] = 5;
openGalleryApi.post = (url, data, additionalHeaders) =>
    openGalleryApi.client.post(`${openGalleryApi.baseUrl}${url}`, data, additionalHeaders);

const flags = [ExtensionQueryFlags.IncludeFiles, ExtensionQueryFlags.IncludeLatestVersionOnly];

const extension = {
    id: "ms-python.python",
};

jest.setTimeout(20_000);

describe("Open VSX e2e", () => {
    it("downloads an extension archive, its signature and public key from Open VSX and verifies the archive", async () => {
        const [ovsxExtension] = await Promise.allSettled([openGalleryApi.getExtension(extension.id, flags)]);
        if (ovsxExtension.status === "fulfilled") {
            const vsixUrl = ovsxExtension.value.versions[0].files.find(
                (file) => file.assetType === "Microsoft.VisualStudio.Services.VSIXPackage",
            );

            const vsixSignature = ovsxExtension.value.versions[0].files.find(
                (file) => file.assetType === "Microsoft.VisualStudio.Services.VsixSignature",
            );

            expect(vsixUrl).toBeDefined();
            expect(vsixSignature).toBeDefined();

            const packageLocation = await download(vsixUrl.source, { filename: EXTENSION_PACKAGE_NAME });
            const signatureLocation = await download(vsixSignature.source, { filename: SIGNED_ARCHIVE_NAME });

            console.time("verify");
            const verificationResult = await verify(packageLocation, signatureLocation, true, {
                verifySignatureManifest: false, // todo(ft): change after next open-vsx.org release
            });
            console.timeEnd("verify");
            expect(verificationResult).toBe(true);
        }

        expect(ovsxExtension.status).toBe("fulfilled");
    });
});
