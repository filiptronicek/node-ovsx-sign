import * as crypto from "crypto";

export const verifySignature = async (file: Buffer, publicKey: string, signature: Buffer): Promise<boolean> => {
    return crypto.verify(null, file, publicKey, signature);
};
