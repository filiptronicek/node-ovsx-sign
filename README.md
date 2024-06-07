# `node-ovsx-sign`

This package is an open-source alternative to Microsoft's proprietary `@vscode/vsce-sign` package, which enables a feature in VS Code called [**Repository signing**](https://code.visualstudio.com/updates/v1_75#_vs-marketplace-extension-signing).

## Compatibility with `@vscode/vsce-sign`

Both the `@vscode/vsce-sign` package and `node-ovsx-sign` are pluggable into VS Code's signature verification process and work as expected. That said, there are a few important differences between the two:

-   `node-ovsx-sign` uses PKCS #8 private keys for signing extension archives while `@vscode/vsce-sign` uses PKCS #7 for signatures. This also means that `node-ovsx-sign` signatures are stored in a `.signature.sig` file, while `@vscode/vsce-sign` signatures are stored in a `.signature.p7s` file.[^1]
-   `node-ovsx-sign` does not offer any platform-specific packages, because it does not ship any binaries.

Additionally, both packages produce interoperable signature manifests which include the size and SHA 256 digest of every file inside of the `.vsix` extension archive. These are stored in a `.signature.manifest` JSON file.

## Installing globally

```sh
npm i -g node-ovsx-sign
```

## Example usage of signing [CLI]

> [!NOTE]
> This requires access to the server-side private key for signing.

```sh
node-ovsx-sign sign extension.vsix keys/private.pem
```

## Example usage of verifying [Node module]

```ts
import { verify, ExtensionSignatureVerificationError } from "node-ovsx-sign";

(async () => {
    try {
        await verify("extension.vsix", "extension.sigzip");
        console.log("Signature verified successfully");
    } catch (e) {
        if (e instanceof ExtensionSignatureVerificationError) {
            console.error("Could not verify extension signature");
        } else {
            throw e;
        }
    }
})();
```

[^1]: The signature file for both packages is contained in a `.sigzip` archive, which VS Code unzips and verifies. VS Code also requires a `.signature.p7s` to be present in the archive, so `node-ovsx-sign` includes an empty one while storing the actual signature in a `.signature.sig` file.
