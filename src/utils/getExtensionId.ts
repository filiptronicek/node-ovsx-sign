import * as zip from 'vsce/out/zip';

export const getExtensionId = async (vsixPath: string): Promise<string> => {
    const { manifest } = (await zip.readVSIXPackage(vsixPath));
    return manifest.publisher + '.' + manifest.name;
};