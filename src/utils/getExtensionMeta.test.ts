import { download } from './download';
import { getExtensionMeta } from './getExtensionMeta';
import { unlink } from 'fs/promises';

jest.setTimeout(20_000);

describe('extensionTest', () => {
  test('be able to verify an extension', async () => {
    const extensionDestination = await download("https://open-vsx.org/api/jeanp413/open-remote-ssh/0.0.33/file/jeanp413.open-remote-ssh-0.0.33.vsix", {});
    const metadata = await getExtensionMeta(extensionDestination);
    expect(metadata.id).toBe('jeanp413.open-remote-ssh');
    expect(metadata.version).toBe('0.0.33');

    // Clean up
    await unlink(extensionDestination);
    console.log(`Deleted ${extensionDestination}`);
  });
});
