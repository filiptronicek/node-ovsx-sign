import * as commander from "commander";
import { verify, sign, keyPair } from "./utils/commands";
import { ExtensionSignatureVerificationError } from "./utils/errors";

export default function (argv: string[]): void {
    const program = new commander.Command();
    program.usage("<command> [options]");

    const verifyCmd = program.command("verify");
    verifyCmd
        .description("Verify an extension package")
        .arguments("<extension-package> <signature-archive>")
        .option("-p, --public-key <public-key>", "The path to the public key to use for verification")
        .option(
            "-m, --verify-signature-manifest",
            "Verify the signature manifest in the signature archive (will be the default in a future release)",
        )
        .option("-v, --verbose", "Capture verbose detail in the event of an error")
        .action(
            async (
                vsixFilePath: string,
                signatureArchiveFilePath: string,
                { publicKey, verifySignatureManifest, verbose },
            ) => {
                try {
                    await verify(vsixFilePath, signatureArchiveFilePath, verbose, {
                        publicKey,
                        verifySignatureManifest,
                    });
                } catch (e) {
                    console.error(e.message);
                    process.exit(1);
                }
            },
        );

    const signCmd = program.command("sign");
    signCmd
        .description("Sign an extension package")
        .arguments("<extension-package> <private-key>")
        .option("-o, --output <output>", "The path to the output signature archive")
        .action(sign);

    const keyPairCmd = program.command("key-pair");
    keyPairCmd
        .description("Generate a ed25519 key pair")
        .option("-o, --output-dir <output-dir>", "The directory to the output key pair")
        .option("-f, --overwrite", "Overwrite existing key pair if it already exists")
        .action(async ({ outputDir, overwrite }) => {
            try {
                await keyPair({ outputDir, overwrite });
            } catch (e) {
                console.error(e.message);
                process.exit(1);
            }
        });

    program.parse(argv);

    if (process.argv.length <= 2) {
        program.help();
    }
}

export { sign, verify, ExtensionSignatureVerificationError };
