import { readVSIXPackage } from "@vscode/vsce/out/zip";

export interface ExtensionMeta {
    id: string;
    version: string;
}

export const getExtensionMeta = async (vsixPath: string): Promise<ExtensionMeta> => {
    const { manifest } = await readVSIXPackage(vsixPath);
    return {
        id: `${manifest.publisher}.${manifest.name}`,
        version: manifest.version,
    };
};
