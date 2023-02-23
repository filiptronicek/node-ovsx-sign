import * as fs from 'fs';
import * as https from "https";
import * as os from "os";
import * as path from "path";
import fetch from 'node-fetch';

import { DEFAULT_REGISTRY_URL } from './constants';

export const loadPrivateKey = (keyPath: string): Promise<string> => {
  return fs.promises.readFile(keyPath, 'utf8');
};

export const loadPublicKey = (keyPath: string): Promise<string> => {
  return fs.promises.readFile(keyPath, 'utf8');
};

const ensureValidPublicKeyUrl = async (url: string): Promise<string> => {
    const publicKeyResponse = await fetch(url.toString());
    if (!publicKeyResponse.ok) {
        throw new Error("Default public key URL is not valid. Aborting signature verification.");
    } else {
        return url;
    }
};

const getPulicKeyUrl = async (extensionId: string): Promise<string> => {
    const registryUrl = new URL(process.env.OVSX_REGISTRY_URL || DEFAULT_REGISTRY_URL);
    const defaultPublicKeyUrl = registryUrl.toString() + `file/public.pem`;

    const registryApiEndpoint = registryUrl.toString() + `api/${extensionId.split(".").join("/")}`;

    const extensionApiResponse = await fetch(registryApiEndpoint.toString());
    if (!extensionApiResponse.ok) {
        console.warn("Failed to fetch extension data from registry API. Trying to use the default public key:");
        console.warn(defaultPublicKeyUrl.toString());

        return ensureValidPublicKeyUrl(defaultPublicKeyUrl);
    }

    const extensionApiData = await extensionApiResponse.json();

    if (!extensionApiData?.files?.signature) {
        console.error("Registry did not provide a public key file. Trying to use the default public key:");
        console.warn(defaultPublicKeyUrl.toString());

        return ensureValidPublicKeyUrl(defaultPublicKeyUrl);
    }

    return extensionApiData.files.publicKey;
};

export const downloadPublicKey = async (extensionId: string): Promise<string> => {
    const urlOfPublicKey = await getPulicKeyUrl(extensionId);

    console.log("Downloading public key from", urlOfPublicKey);
    const publicKey: string = await new Promise((resolve, reject) => {
        https
            .get(urlOfPublicKey, (res) => {
                let data = "";
                res.on("data", (chunk) => {
                    data += chunk;
                });
                res.on("end", () => {
                    resolve(data);
                });
            })
            .on("error", (err) => {
                reject(err);
            });
    });

    const downloadLocation = path.join(
        os.tmpdir(),
        `ovsx-sign-keys/public_key.pem`
    );
    await fs.promises.mkdir(path.dirname(downloadLocation), { recursive: true });
    console.info("Writing public key to", downloadLocation);

    // Write the public key to a file
    await fs.promises.writeFile(downloadLocation, publicKey);
    return downloadLocation;
};

