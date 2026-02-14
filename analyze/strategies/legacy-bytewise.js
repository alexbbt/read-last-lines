const fs = require("fs/promises");

function decodeResult(binaryText, encoding) {
	if (encoding === "buffer") {
		return Buffer.from(binaryText, "binary");
	}

	return Buffer.from(binaryText, "binary").toString(encoding);
}

async function legacyBytewise(filePath, maxLineCount, encoding = "utf8") {
	if (!Number.isFinite(maxLineCount)) {
		throw new TypeError("maxLineCount must be a finite number");
	}

	if (!Number.isInteger(maxLineCount)) {
		throw new TypeError("maxLineCount must be an integer");
	}

	if (maxLineCount <= 0) {
		return encoding === "buffer" ? Buffer.alloc(0) : "";
	}

	let fileHandle;
	try {
		fileHandle = await fs.open(filePath, "r");
		const stat = await fileHandle.stat();
		const oneByte = Buffer.alloc(1);

		let chars = 0;
		let lineCount = 0;
		let lines = "";

		// eslint-disable-next-line no-constant-condition
		while (true) {
			if (lines.length > stat.size) {
				lines = lines.substring(lines.length - stat.size);
			}

			if (lines.length >= stat.size || lineCount >= maxLineCount) {
				if (lines.startsWith("\n")) {
					lines = lines.substring(1);
				}
				return decodeResult(lines, encoding);
			}

			const position = stat.size - 1 - chars;
			const { bytesRead } = await fileHandle.read(oneByte, 0, 1, position);
			if (bytesRead === 0) {
				return decodeResult(lines, encoding);
			}

			const nextCharacter = String.fromCharCode(oneByte[0]);
			lines = nextCharacter + lines;
			if (nextCharacter === "\n" && lines.length > 1) {
				lineCount++;
			}
			chars++;
		}
	} finally {
		if (fileHandle) {
			await fileHandle.close();
		}
	}
}

module.exports = {
	legacyBytewise,
};
