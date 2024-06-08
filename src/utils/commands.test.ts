import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { keyPair, sign, verify } from "./commands";
import { download } from "./download";

jest.setTimeout(20_000);

describe("e2e test", () => {
    test("be able to generate keys, sign and verify signature", async () => {
        const extensionDestination = await download(
            "https://open-vsx.org/api/jeanp413/open-remote-ssh/0.0.33/file/jeanp413.open-remote-ssh-0.0.33.vsix",
            {},
        );

        const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ovsx-"));
        const archiveOutputPath = path.join(tmpDir, "extension.sigzip");
        const { privateKeyPath, publicKeyPath } = await keyPair({ outputDir: tmpDir, overwrite: false });

        await sign(extensionDestination, privateKeyPath, { output: archiveOutputPath });

        expect(
            await verify(extensionDestination, archiveOutputPath, true, {
                publicKey: publicKeyPath,
                verifySignatureManifest: true,
            }),
        ).toBe(true);

        // Clean up
        await fs.unlink(extensionDestination);
        await fs.unlink(archiveOutputPath);
        await fs.unlink(privateKeyPath);
        await fs.unlink(publicKeyPath);
        console.log(`Deleted ${extensionDestination}`);
    });
});
