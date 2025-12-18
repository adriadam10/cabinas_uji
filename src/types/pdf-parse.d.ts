declare module 'pdf-parse/lib/pdf-parse.js' {
    function pdf(dataBuffer: Buffer, options?: any): Promise<any>;
    export = pdf;
}
