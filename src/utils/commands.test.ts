import { unlink } from "fs/promises";
import { keyPair, sign, verify } from "./commands";
import { download } from "./download";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

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

        expect(await verify(extensionDestination, archiveOutputPath, true, { publicKey: publicKeyPath })).toBe(true);

        // Clean up
        await unlink(extensionDestination);
        await unlink(archiveOutputPath);
        await unlink(privateKeyPath);
        await unlink(publicKeyPath);
        console.log(`Deleted ${extensionDestination}`);
    });
});
