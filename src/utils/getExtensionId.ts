import { readVSIXPackage } from '@vscode/vsce/out/zip';

export const getExtensionId = async (vsixPath: string): Promise<string> => {
    const { manifest } = await readVSIXPackage(vsixPath);
    return manifest.publisher + '.' + manifest.name;
};