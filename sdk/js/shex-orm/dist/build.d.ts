interface BuildOptions {
    input: string;
    output: string;
    baseIRI?: string;
}
export declare function build({ input: inputFile, output: outputFile, baseIRI, }: BuildOptions): Promise<void>;
export {};
//# sourceMappingURL=build.d.ts.map