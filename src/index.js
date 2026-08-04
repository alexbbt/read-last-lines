const fs = require("fs/promises");

const DEFAULT_CHUNK_SIZE = 64 * 1024;

function logicalLineCount(data) {
	if (!data) {
		return 0;
	}
	let normalized = data.replace(/\r\n/g, "\n");
	if (normalized.endsWith("\n")) {
		normalized = normalized.slice(0, -1);
	}
	return normalized ? normalized.split("\n").length : 0;
}

function finalizeLines(lines, maxLineCount) {
	if (lines.startsWith("\n")) {
		const trimmed = lines.substring(1);
		const maxLines = Math.ceil(Number(maxLineCount));
		// Keep a leading newline when trimming would under-read (e.g. newline-only files).
		if (logicalLineCount(trimmed) >= maxLines || logicalLineCount(lines) > maxLines) {
			lines = trimmed;
		}
	}
	// Cap over-reads from multiple trailing newlines (#41).
	while (logicalLineCount(lines) > Math.ceil(Number(maxLineCount))) {
		const nextNewline = lines.indexOf("\n");
		if (nextNewline === -1) {
			return "";
		}
		lines = lines.substring(nextNewline + 1);
	}
	return lines;
}

function decodeResult(lines, encoding) {
	if (encoding === "buffer") {
		return Buffer.from(lines, "binary");
	}
	return Buffer.from(lines, "binary").toString(encoding);
}

module.exports = {
	/**
	 * Read in the last `n` lines of a file
	 * @param  {string}   input_file_path - file (direct or relative path to file.)
	 * @param  {int}      maxLineCount    - max number of lines to read in.
	 * @param  {encoding} encoding        - specifies the character encoding to be used, or 'buffer'. defaults to 'utf8'.
	 *
	 * @return {promise}  a promise resolved with the lines or rejected with an error.
	 */
	read: function(input_file_path, maxLineCount, encoding) {
		if (encoding == null) {
			encoding = "utf8";
		}

		return (async() => {
			let file = null;
			try {
				try {
					file = await fs.open(input_file_path, "r");
				} catch (err) {
					if (err && err.code === "ENOENT") {
						throw new Error("file does not exist");
					}
					throw err;
				}

				const stat = await file.stat();

				if (maxLineCount <= 0) {
					return encoding === "buffer" ? Buffer.alloc(0) : "";
				}

				if (stat.size === 0) {
					return encoding === "buffer" ? Buffer.alloc(0) : "";
				}

				// Match prior coercion: NaN / Infinity never satisfy lineCount >= max, so read all.
				const readAll = !Number.isFinite(Number(maxLineCount));
				const chunks = [];
				let position = stat.size;
				let lineCount = 0;
				let skippedTrailingNewline = false;

				while (position > 0 && (readAll || !(lineCount >= maxLineCount))) {
					const bytesToRead = Math.min(DEFAULT_CHUNK_SIZE, position);
					position -= bytesToRead;

					const chunk = Buffer.allocUnsafe(bytesToRead);
					const { bytesRead } = await file.read(chunk, 0, bytesToRead, position);
					const buf = bytesRead === bytesToRead ? chunk : chunk.subarray(0, bytesRead);

					let sliceFrom = 0;
					let hitBoundary = false;

					for (let i = buf.length - 1; i >= 0; i--) {
						if (buf[i] !== 0x0a) {
							continue;
						}

						// Same idea as before: the file's final newline is not a line by itself.
						if (!skippedTrailingNewline && position + buf.length === stat.size && i === buf.length - 1) {
							skippedTrailingNewline = true;
							continue;
						}

						lineCount++;
						if (!readAll && lineCount >= maxLineCount) {
							// Keep content after this newline (the last maxLineCount lines).
							sliceFrom = i + 1;
							hitBoundary = true;
							break;
						}
					}

					if (hitBoundary) {
						if (sliceFrom < buf.length) {
							chunks.push(buf.subarray(sliceFrom));
						}
						break;
					}

					chunks.push(buf);
				}

				const lines = finalizeLines(Buffer.concat(chunks.reverse()).toString("binary"), maxLineCount);
				return decodeResult(lines, encoding);
			} finally {
				if (file) {
					await file.close().catch(() => {
						// Ignore close errors when already rejecting for another reason.
					});
				}
			}
		})();
	},
};
