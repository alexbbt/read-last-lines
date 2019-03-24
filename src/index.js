const fs = require("mz/fs");

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

		const NEW_LINE_CHARACTERS = ["\n", "\r"];

		if (encoding == null) {
			encoding = "utf8";
		}

		const readPreviousChar = function( stat, file, currentCharacterCount) {
			return fs.read(file, Buffer.alloc(1), 0, 1, stat.size - 1 - currentCharacterCount)
				.then((bytesReadAndBuffer) => {
					return String.fromCharCode(bytesReadAndBuffer[1][0]);
				});
		};

		return new Promise((resolve, reject) => {
			let self = {
				stat: null,
				file: null,
			};

			fs.exists(input_file_path)
				.then((exists) => {
					if (!exists) {
						throw new Error("file does not exist");
					}

				}).then(() => {
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
					let chars = 0;
					let lineCount = 0;
					let lines = "";

					const do_while_loop = function() {
						if (lines.length > self.stat.size) {
							lines = lines.substring(lines.length - self.stat.size);
						}

						if (lines.length >= self.stat.size || lineCount >= maxLineCount) {
							if (NEW_LINE_CHARACTERS.includes(lines.substring(0, 1))) {
								lines = lines.substring(1);
							}
							fs.close(self.file);
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
						fs.close(self.file).catch((error) => {
							// We might get here if the encoding is invalid.
							// Since we are already rejecting, let's ignore this error.
						});
					}
					return reject(reason);
				});
		});
	},
};
