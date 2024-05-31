import fetch from "node-fetch";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export const download = async (url: string, options: { filename?: string; foldername?: string }) => {
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "ovsx-"));
    const destinationFolder = options.foldername || tmpDir;

    const filename = options.filename || url.split("/").pop() || "downloaded-file";
    const destination = path.join(destinationFolder, filename);
    console.debug(`Downloading file from ${url} to ${destination}`);

    const response = await fetch(url);
    const fileStream = fs.createWriteStream(destination);
    await new Promise((resolve, reject) => {
        response.body.pipe(fileStream);
        response.body.on("error", reject);
        fileStream.on("finish", resolve);
    });
    return destination;
};
