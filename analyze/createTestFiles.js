/* eslint-disable no-console */
const fs = require("fs");
const once = require("events").once;
const cliProgress = require("cli-progress");

const fileLengths = require("./fileLengths.js");
const files = Object.entries(fileLengths);

async function makeTestFile(path, numLines)
{
	console.log(`Making test file with length ${numLines}:`);

	const file = fs.createWriteStream(path, "utf8");
	const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

	progressBar.start(numLines, 0);

	for (let index = 0; index < numLines; index++) {
		progressBar.update(index + 1);
		let data = index > 0 ? "\n" : "";
		data += `${index+1} Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua`;

		if (!file.write(data))
		{
			await once(file, "drain");
		}
	}

	progressBar.stop();
	file.end();
	console.log();
}

fs.mkdirSync("benchmark/test-files", {
	recursive: true,
});


async function main() {
	for (const [fileName, fileLength] of files) {
		await makeTestFile(fileName, fileLength);
	}
}

main();
