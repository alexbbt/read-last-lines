const fs = require("fs/promises");

const DEFAULT_CHUNK_SIZE = 64 * 1024;

function logicalLineCount(buf) {
	if (!buf || buf.length === 0) {
		return 0;
	}

	let end = buf.length;
	if (buf[end - 1] === 0x0a) {
		end -= 1;
	}
	if (end === 0) {
		return 0;
	}

	let newlines = 0;
	for (let i = 0; i < end; i++) {
		if (buf[i] === 0x0a) {
			newlines++;
		}
	}
	return newlines + 1;
}

function finalizeLines(buf, maxLineCount) {
	if (buf.length > 0 && buf[0] === 0x0a) {
		const trimmed = buf.subarray(1);
		const maxLines = Math.ceil(Number(maxLineCount));
		if (logicalLineCount(trimmed) >= maxLines || logicalLineCount(buf) > maxLines) {
			buf = trimmed;
		}
	}

	while (logicalLineCount(buf) > Math.ceil(Number(maxLineCount))) {
		const nextNewline = buf.indexOf(0x0a);
		if (nextNewline === -1) {
			return Buffer.alloc(0);
		}
		buf = buf.subarray(nextNewline + 1);
	}
	return buf;
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
	read: async function(input_file_path, maxLineCount, encoding) {
		if (encoding == null) {
			encoding = "utf8";
		}

		let file = null;
		try {
			file = await fs.open(input_file_path, "r");
			const stat = await file.stat();

			if (maxLineCount <= 0) {
				return encoding === "buffer" ? Buffer.alloc(0) : "";
			}

			if (stat.size === 0) {
				return encoding === "buffer" ? Buffer.alloc(0) : "";
			}

			// NaN / Infinity never satisfy lineCount >= max, so read the whole file.
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

					// Skip the file's final trailing newline once.
					if (!skippedTrailingNewline && position + buf.length === stat.size && i === buf.length - 1) {
						skippedTrailingNewline = true;
						continue;
					}

					lineCount++;
					if (!readAll && lineCount >= maxLineCount) {
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

			const lines = finalizeLines(Buffer.concat(chunks.reverse()), maxLineCount);
			if (encoding === "buffer") {
				return lines;
			}
			return lines.toString(encoding);
		} catch (err) {
			if (err && err.code === "ENOENT") {
				throw new Error("file does not exist");
			}
			throw err;
		} finally {
			if (file) {
				await file.close().catch(() => {
					// Ignore close errors when already rejecting for another reason.
				});
			}
		}
	},
};
