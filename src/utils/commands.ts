import * as fs from "fs";
import { ExtensionSignatureVerificationError } from "./errors";
import { downloadPublicKey, loadPrivateKey, loadPublicKey } from './keys';
import { signFile } from './sign';
import { SIGNED_ARCHIVE_NAME } from "./constants";
import { verifySignature } from "./verify";
import * as crypto from 'crypto';
import { getExtensionId } from "./getExtensionId";

/**
 * Sign an extension package. The signature is saved to `extension.sigzip`
 * @param vsixFilePath the path to the `.vsix` file of the extension
 * @param privateKeyFilePath the path to the private key used to sign the extension
 */
export const sign = async (vsixFilePath: string, privateKeyFilePath: string, options?: {
    output?: string;
}): Promise<void> => {
    const extensionFile = await fs.promises.readFile(vsixFilePath);
    const privateKey = await loadPrivateKey(privateKeyFilePath);
    const outputPath = options?.output ?? `./${SIGNED_ARCHIVE_NAME}`;

    const signature = await signFile(extensionFile, privateKey) as Buffer;
    await fs.promises.writeFile(outputPath, signature);

    console.info(`Signature file created at ${outputPath}`);
};

/**
* Verify an extension package against a signature archive
* @param vsixFilePath The extension file path.
* @param signatureArchiveFilePath The signature archive file path.
* @param verbose A flag indicating whether or not to capture verbose detail in the event of an error.
* @throws { ExtensionSignatureVerificationError } An error with a code indicating the validity, integrity, or trust issue
 * found during verification or a more fundamental issue (e.g.:  a required dependency was not found).
*/
export const verify = async (vsixFilePath: string, signatureArchiveFilePath: string, verbose = false, options?: {
    publicKey?: string;
}): Promise<boolean> => {

    if (!fs.existsSync(vsixFilePath)) {
        throw new ExtensionSignatureVerificationError(3, false);
    }

    if (!fs.existsSync(signatureArchiveFilePath)) {
        throw new ExtensionSignatureVerificationError(6, false);
    }

    verbose && console.info("Reading extension file");
    const extensionFile = await fs.promises.readFile(vsixFilePath);


    verbose && console.info("Getting extension id from extension manifest");
    const extensionIdFromManifest = await getExtensionId(vsixFilePath);
    verbose && console.info(`Got id: ${extensionIdFromManifest}`);

    verbose && console.info("Loading public key");
    const publicKey = await loadPublicKey(options?.publicKey || await downloadPublicKey(extensionIdFromManifest));

    verbose && console.info("Reading signature archive");
    const signature = await fs.promises.readFile(signatureArchiveFilePath);

    verbose && console.info("Verifying signature");
    const signatureValid = await verifySignature(extensionFile, publicKey, signature);

    if (!signatureValid) {
        console.error("Signature is not valid");
        throw new ExtensionSignatureVerificationError(102, true);
    }

    console.info("Signature is valid");
    return true;
};

export const keyPair = async (options?: { outputDir?: string; overwrite: boolean; }): Promise<void> => {
    const keyPairOptions = {
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    };

    const pair: unknown = crypto.generateKeyPairSync('ed25519', keyPairOptions);
    const pairObj = pair as { publicKey: string, privateKey: string };
    const outputDir = options?.outputDir ?? ".";
    const flag = options?.overwrite ? "w" : "wx";
    await fs.promises.writeFile(`${outputDir}/public.pem`, pairObj.publicKey, { flag });
    await fs.promises.writeFile(`${outputDir}/private.pem`, pairObj.privateKey, { flag });
};