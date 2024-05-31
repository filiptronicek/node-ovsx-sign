import * as crypto from "node:crypto";

export const signFile = async (file: Buffer, privateKey: string): Promise<Buffer> => {
    return crypto.sign(null, file, privateKey);
};
