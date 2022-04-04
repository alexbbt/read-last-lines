const util = require("util");
const fs = require("fs");

const fsExists = util.promisify(fs.exists);
const fsRead = util.promisify(fs.read);
const fsStat = util.promisify(fs.stat);
const fsOpen = util.promisify(fs.open);
const fsClose = util.promisify(fs.close);

module.exports = {
	/**
	 * Read in the last `n` lines of a file
	 * @param  {string}   inputFilePath   - file (direct or relative path to file.)
	 * @param  {int}      maxLineCount    - max number of lines to read in.
	 * @param  {encoding} encoding        - specifies the character encoding to be used, or 'buffer'. defaults to 'utf8'.
	 *
	 * @return {promise}  a promise resolved with the lines or rejected with an error.
	 */
	read: async function(inputFilePath, maxLineCount, encoding) {

		if (encoding == null) {
			encoding = "utf8";
		}

		const exists = await fsExists(inputFilePath);
		if (!exists) {
			throw new Error("file does not exist");
		}

		// Load file Stats.
		const stat = await fsStat(inputFilePath);

		// Open file for reading.
		const file = await fsOpen(inputFilePath, "r");

		const bufferSize = Math.min(16384, stat.size);
		const readBuffer = Buffer.alloc(bufferSize);
		let readBufferRemaining = 0;
		let allBytes = [];
		let lineCount = 0;
		let fileOffset = stat.size;

		while (lineCount < maxLineCount && fileOffset > 0) {
			// Read the next chunk of the file
			const readSize = Math.min(readBuffer.length, fileOffset);
			fileOffset -= readSize;
			const readResult = await fsRead(file, readBuffer, 0, readSize, fileOffset);
			
			// If there's still data in our read buffer, then finish processing that
			readBufferRemaining = readResult.bytesRead;
			while(readBufferRemaining > 0) {
				const bufferIndex = readBufferRemaining - 1;
				if(readBuffer[bufferIndex] === 0x0a && allBytes.length) {
					++lineCount;					
					if(lineCount >= maxLineCount) {
						break;
					}
				}
				allBytes.push(readBuffer[readBufferRemaining - 1]);
				--readBufferRemaining;
			}
		}

		await fsClose(file);

		// Reverse the array
		allBytes.reverse();
		
		if(encoding === "buffer") {
			return Buffer.from(allBytes);
		} else {
			return Buffer.from(allBytes).toString(encoding);
		}
	},
};
