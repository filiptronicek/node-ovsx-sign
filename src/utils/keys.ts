import fetch from "node-fetch";
import * as fs from "node:fs";

import { download } from "./download";
import { getMarketplaceEndpoint } from "./endpoints";
import { ExtensionMeta } from "./extension-metadata";

export const loadPrivateKey = (keyPath: string): Promise<string> => {
    return fs.promises.readFile(keyPath, "utf8");
};

export const loadPublicKey = (keyPath: string): Promise<string> => {
    return fs.promises.readFile(keyPath, "utf8");
};

const ensureValidPublicKeyUrl = async (url: string): Promise<string> => {
    const publicKeyResponse = await fetch(url.toString());
    if (!publicKeyResponse.ok) {
        throw new Error("Default public key URL is not valid. Aborting signature verification.");
    } else {
        return url;
    }
};

const getPulicKeyUrl = async (extension: ExtensionMeta): Promise<string> => {
    const registryUrl = new URL(getMarketplaceEndpoint());
    const defaultPublicKeyUrl = registryUrl.toString() + `file/public.pem`;

    const registryApiEndpoint =
        registryUrl.toString() + `api/${extension.id.split(".").join("/")}/${extension.version}`;

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

export const downloadPublicKey = async (extension: ExtensionMeta): Promise<string> => {
    const urlOfPublicKey = await getPulicKeyUrl(extension);
    const downloadLocation = await download(urlOfPublicKey, { filename: "public.pem" });

    return downloadLocation;
};
