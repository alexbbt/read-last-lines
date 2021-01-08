declare namespace readLastLines {
  export function read(
    input_file_path: string,
    maxLineCount: number,
    encoding: "buffer"
  ): Promise<Buffer>;
  export function read(
    input_file_path: string,
    maxLineCount: number,
    encoding?: BufferEncoding
  ): Promise<string>;
}

export = readLastLines;
