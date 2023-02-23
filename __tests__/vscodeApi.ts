import * as download from 'download';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { PublicGalleryAPI } from '@vscode/vsce/out/publicgalleryapi';
import { ExtensionQueryFlags } from 'azure-devops-node-api/interfaces/GalleryInterfaces';

import { DEFAULT_REGISTRY_URL, EXTENSION_PACKAGE_NAME, SIGNED_ARCHIVE_NAME } from '../src/utils/constants';
import { verify } from '../src';

const openGalleryApi = new PublicGalleryAPI(`${process.env.OVSX_REGISTRY_URL || DEFAULT_REGISTRY_URL}/vscode`, '3.0-preview.1');
openGalleryApi.client['_allowRetries'] = true;
openGalleryApi.client['_maxRetries'] = 5;
openGalleryApi.post = (url, data, additionalHeaders) =>
    openGalleryApi.client.post(`${openGalleryApi.baseUrl}${url}`, data, additionalHeaders);

const flags = [
    ExtensionQueryFlags.IncludeFiles,
    ExtensionQueryFlags.IncludeLatestVersionOnly,
];

const extension = {
    id: 'ms-python.python'
}

describe('extensionTest', () => {
    test('be able to verify an extension', async () => {
        const [ovsxExtension] = await Promise.allSettled([openGalleryApi.getExtension(extension.id, flags)]);
        if (ovsxExtension.status === 'fulfilled') {
            const vsixUrl = ovsxExtension.value.versions[0].files.find(file => file.assetType === 'Microsoft.VisualStudio.Services.VSIXPackage');

            const vsixSignature = ovsxExtension.value.versions[0].files.find(file => file.assetType === 'Microsoft.VisualStudio.Services.VsixSignature');

            expect(vsixUrl).toBeDefined();
            expect(vsixSignature).toBeDefined();

            const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ovsx-'));

            await download(vsixUrl.source, tmpDir, { filename: EXTENSION_PACKAGE_NAME });
            await download(vsixSignature.source, tmpDir, { filename: SIGNED_ARCHIVE_NAME });

            const verificationResult = await verify(path.join(tmpDir, EXTENSION_PACKAGE_NAME), path.join(tmpDir, SIGNED_ARCHIVE_NAME));
            expect(verificationResult).toBe(true);
        }
        expect(ovsxExtension.status).toBe('fulfilled');
    });
});