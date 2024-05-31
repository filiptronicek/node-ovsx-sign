import * as crypto from "node:crypto";

export const verifySignature = async (file: Buffer, publicKey: string, signature: Buffer): Promise<boolean> => {
    return crypto.verify(null, file, publicKey, signature);
};
