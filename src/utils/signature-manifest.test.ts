import { download } from "./download";
import { unlink } from "fs/promises";
import { generateSignatureManifest } from "./signature-manifest";

jest.setTimeout(20_000);

describe("signatureManifestTest", () => {
    test("be able to generate a signature manifest file", async () => {
        const extensionDestination = await download(
            "https://open-vsx.org/api/jeanp413/open-remote-ssh/0.0.33/file/jeanp413.open-remote-ssh-0.0.33.vsix",
            {},
        );
        expect(await generateSignatureManifest(extensionDestination)).toMatchSnapshot();

        // Clean up
        await unlink(extensionDestination);
        console.log(`Deleted ${extensionDestination}`);
    });
});
