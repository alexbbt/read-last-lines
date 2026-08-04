const fs = require("fs/promises");

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

		const NEW_LINE_CHARACTERS = ["\n"];

		if (encoding == null) {
			encoding = "utf8";
		}

		const readPreviousChar = function(stat, file, currentCharacterCount) {
			return file.read(Buffer.alloc(1), 0, 1, stat.size - 1 - currentCharacterCount)
				.then(({ buffer }) => {
					return String.fromCharCode(buffer[0]);
				});
		};

		const logicalLineCount = function(data) {
			if (!data) {
				return 0;
			}
			let normalized = data.replace(/\r\n/g, "\n");
			if (normalized.endsWith("\n")) {
				normalized = normalized.slice(0, -1);
			}
			return normalized ? normalized.split("\n").length : 0;
		};

		return new Promise((resolve, reject) => {
			let self = {
				stat: null,
				file: null,
			};

			fs.access(input_file_path)
				.catch((err) => {
					if (err && err.code === "ENOENT") {
						throw new Error("file does not exist");
					}
					throw err;
				})
				.then(() => {
					let promises = [];

					// Load file Stats.
					promises.push(
						fs.stat(input_file_path)
							.then(stat => self.stat = stat));

					// Open file for reading.
					promises.push(
						fs.open(input_file_path, "r")
							.then(file => self.file = file));

					return Promise.all(promises);
				}).then(() => {
					if (maxLineCount <= 0) {
						self.file.close();
						if (encoding === "buffer") {
							return resolve(Buffer.alloc(0));
						}
						return resolve("");
					}

					let chars = 0;
					let lineCount = 0;
					let lines = "";

					const do_while_loop = function() {
						if (lines.length > self.stat.size) {
							lines = lines.substring(lines.length - self.stat.size);
						}

						if (lines.length >= self.stat.size || lineCount >= maxLineCount) {
							if (NEW_LINE_CHARACTERS.includes(lines.substring(0, 1))) {
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
									lines = "";
									break;
								}
								lines = lines.substring(nextNewline + 1);
							}
							self.file.close();
							if (encoding === "buffer") {
								return resolve(Buffer.from(lines, "binary"));
							}
							return resolve(Buffer.from(lines, "binary").toString(encoding));
						}

						return readPreviousChar(self.stat, self.file, chars)
							.then((nextCharacter) => {
								lines = nextCharacter + lines;
								if (NEW_LINE_CHARACTERS.includes(nextCharacter) && lines.length > 1) {
									lineCount++;
								}
								chars++;
							})
							.then(do_while_loop);
					};
					return do_while_loop();

				}).catch((reason) => {
					if (self.file !== null) {
						self.file.close().catch(() => {
							// We might get here if the encoding is invalid.
							// Since we are already rejecting, let's ignore this error.
						});
					}
					return reject(reason);
				});
		});
	},
};
