export class ExtensionSignatureVerificationError extends Error {
    code: string;
    didExecute: boolean;
    output: string;
    constructor(code: string, didExecute: boolean, output: string) {
        super();
        this.code = code;
        this.didExecute = didExecute;
        this.output = output;
    }
}
