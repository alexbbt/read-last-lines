const fs = require("fs/promises");

function decodeResult(buffer, encoding) {
	if (encoding === "buffer") {
		return buffer;
	}
	return buffer.toString(encoding);
}

async function chunkedReverse(filePath, maxLineCount, encoding = "utf8", options = {}) {
	if (!Number.isFinite(maxLineCount)) {
		throw new TypeError("maxLineCount must be a finite number");
	}

	if (!Number.isInteger(maxLineCount)) {
		throw new TypeError("maxLineCount must be an integer");
	}

	if (maxLineCount <= 0) {
		return encoding === "buffer" ? Buffer.alloc(0) : "";
	}

	const chunkSize = options.chunkSize || 64 * 1024;
	let fileHandle;

	try {
		fileHandle = await fs.open(filePath, "r");
		const stat = await fileHandle.stat();

		if (stat.size === 0) {
			return encoding === "buffer" ? Buffer.alloc(0) : "";
		}

		const chunks = [];
		let position = stat.size;
		let lineCount = 0;
		let firstByteIsTrailingNewline = false;

		while (position > 0 && lineCount <= maxLineCount) {
			const bytesToRead = Math.min(chunkSize, position);
			position -= bytesToRead;

			const chunk = Buffer.allocUnsafe(bytesToRead);
			const { bytesRead } = await fileHandle.read(chunk, 0, bytesToRead, position);
			if (bytesRead !== bytesToRead) {
				throw new Error("read size mismatch");
			}

			let scanStart = bytesRead - 1;
			for (; scanStart >= 0; scanStart--) {
				if (chunk[scanStart] === 0x0a) {
					// If the file ends in \n, the first encountered newline marks the trailing terminator.
					if (!firstByteIsTrailingNewline && position + bytesRead === stat.size && scanStart === bytesRead - 1) {
						firstByteIsTrailingNewline = true;
						continue;
					}

					lineCount++;
					if (lineCount >= maxLineCount) {
						scanStart++;
						break;
					}
				}
			}

			if (scanStart < 0) {
				chunks.push(chunk);
			} else if (scanStart < bytesRead) {
				chunks.push(chunk.subarray(scanStart));
				break;
			}
		}

		const result = Buffer.concat(chunks.reverse());
		return decodeResult(result, encoding);
	} finally {
		if (fileHandle) {
			await fileHandle.close();
		}
	}
}

module.exports = {
	chunkedReverse,
};
