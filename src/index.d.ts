declare namespace readLastLines {
    export function read(
        input_file_path: string,
        maxLineCount: number,
        encoding?: string): Promise<any>;
}

export = readLastLines;
