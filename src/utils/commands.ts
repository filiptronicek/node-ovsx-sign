import * as crypto from "crypto";
import * as fs from "node:fs";
import { SIGNATURE_FILE_NAME, SIGNATURE_MANIFEST_FILE_NAME, SIGNED_ARCHIVE_NAME } from "./constants";
import { ExtensionSignatureVerificationError } from "./errors";
import { getExtensionMeta } from "./extension-metadata";
import { downloadPublicKey, loadPrivateKey, loadPublicKey } from "./keys";
import { signFile } from "./sign";
import { generateManifest, verifyManifest } from "./signature-manifest";
import { verifySignature } from "./verify";
import { extractFileAsBufferUsingStreams, zipBuffers } from "./zip";

/**
 * Sign an extension package. The signature is saved to `extension.sigzip`
 * @param vsixFilePath the path to the `.vsix` file of the extension
 * @param privateKeyFilePath the path to the private key used to sign the extension
 */
export const sign = async (
    vsixFilePath: string,
    privateKeyFilePath: string,
    options?: {
        output?: string;
    },
): Promise<void> => {
    const extensionFile = await fs.promises.readFile(vsixFilePath);
    const privateKey = await loadPrivateKey(privateKeyFilePath);
    const outputPath = options?.output ?? `./${SIGNED_ARCHIVE_NAME}`;

    const signature = await signFile(extensionFile, privateKey);
    const signatureManifest = await generateManifest(vsixFilePath);

    const files = [
        { filename: SIGNATURE_FILE_NAME, buffer: signature },
        { filename: SIGNATURE_MANIFEST_FILE_NAME, buffer: Buffer.from(JSON.stringify(signatureManifest)) },
        // We leave the p7s file empty because VS Code expects it to be present
        // https://github.com/microsoft/vscode/blob/0ead1f80c9e0d6ea0732c40faea3095c6f7f165a/src/vs/platform/extensionManagement/node/extensionDownloader.ts#L157
        { filename: ".signature.p7s", buffer: Buffer.alloc(0) },
    ];
    const zippedSignature = await zipBuffers(files);

    await fs.promises.writeFile(outputPath, zippedSignature);

    console.info(`Signature file created at ${outputPath}`);
};

/**
 * Verify an extension package against a signature archive
 * @param vsixFilePath The extension file path.
 * @param signatureArchiveFilePath The signature archive file path (`.sigzip`).
 * @param verbose A flag indicating whether or not to capture verbose detail in the event of an error.
 * @throws { ExtensionSignatureVerificationError } An error with a code indicating the validity, integrity, or trust issue
 * found during verification or a more fundamental issue (e.g. a required dependency was not found).
 */
export const verify = async (
    vsixFilePath: string,
    signatureArchiveFilePath: string,
    verbose = false,
    options?: {
        publicKey?: string;
        verifySignatureManifest?: boolean;
    },
): Promise<boolean> => {
    if (!fs.existsSync(vsixFilePath)) {
        throw new ExtensionSignatureVerificationError(
            "PackageIsInvalidZip",
            false,
            "The extension package is not a valid zip file",
        );
    }

    if (!fs.existsSync(signatureArchiveFilePath)) {
        throw new ExtensionSignatureVerificationError(
            "SignatureArchiveIsInvalidZip",
            false,
            "The signature archive is not a valid zip file",
        );
    }

    verbose && console.info("Reading extension file");
    const extensionFile = await fs.promises.readFile(vsixFilePath);

    verbose && console.info("Getting extension id from extension manifest");
    const extensionMetaFromManifest = await getExtensionMeta(vsixFilePath);
    if (!extensionMetaFromManifest.id) {
        throw new ExtensionSignatureVerificationError(
            "ExtensionManifestIsInvalid",
            false,
            "The extension manifest is not valid",
        );
    }

    verbose && console.info(`Got extension metadata for ${extensionMetaFromManifest.id}`);

    verbose && console.info("Loading public key");
    const publicKey = await loadPublicKey(options?.publicKey || (await downloadPublicKey(extensionMetaFromManifest)));

    verbose && console.info("Reading signature archive");
    const signature = await extractFileAsBufferUsingStreams(signatureArchiveFilePath, SIGNATURE_FILE_NAME).catch(() => {
        throw new ExtensionSignatureVerificationError(
            "SignatureIsMissing",
            false,
            "The signature is missing from the signature archive",
        );
    });

    if (options?.verifySignatureManifest) {
        const manifest = JSON.parse(
            (
                await extractFileAsBufferUsingStreams(signatureArchiveFilePath, SIGNATURE_MANIFEST_FILE_NAME).catch(
                    () => {
                        throw new ExtensionSignatureVerificationError(
                            "SignatureManifestIsMissing",
                            false,
                            "The signature manifest is missing from the signature archive",
                        );
                    },
                )
            ).toString("utf-8"),
        );

        verbose && console.info("Verifying signature manifest");
        const signatureManifestValid = await verifyManifest(manifest, vsixFilePath);
        if (!signatureManifestValid) {
            throw new ExtensionSignatureVerificationError(
                "SignatureManifestIsInvalid",
                true,
                "The signature manifest is not valid",
            );
        }

        console.info("Signature manifest is valid");
    }

    verbose && console.info("Verifying signature");
    const signatureValid = await verifySignature(extensionFile, publicKey, signature);
    if (!signatureValid) {
        console.error("Signature is not valid");
        throw new ExtensionSignatureVerificationError("SignatureManifestIsInvalid", true, "The signature is not valid");
    }

    console.info("Signature is valid");
    return true;
};

export const keyPair = async (options?: {
    outputDir?: string;
    overwrite: boolean;
}): Promise<{
    privateKeyPath: string;
    publicKeyPath: string;
}> => {
    const keyPairOptions = {
        publicKeyEncoding: {
            type: "spki",
            format: "pem",
        },
        privateKeyEncoding: {
            type: "pkcs8",
            format: "pem",
        },
    };

    const pair: unknown = crypto.generateKeyPairSync("ed25519", keyPairOptions);
    const pairObj = pair as { publicKey: string; privateKey: string };
    const outputDir = options?.outputDir ?? ".";
    const flag = options?.overwrite ? "w" : "wx";

    const publicKeyPath = `${outputDir}/public.pem`;
    const privateKeyPath = `${outputDir}/private.pem`;

    await fs.promises.writeFile(publicKeyPath, pairObj.publicKey, { flag });
    await fs.promises.writeFile(privateKeyPath, pairObj.privateKey, { flag });

    return { publicKeyPath, privateKeyPath };
};
