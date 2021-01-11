/* eslint-disable no-console */
const { suite, add, cycle, complete, save } = require("benny");
const fs = require("fs");
const rll = require("../src/index.js");
const fileLengths = require("./fileLengths.js");

const files = Object.entries(fileLengths);

const linesToReads = [
	50,
	100,
	500,
	1000,
];

async function runTest(fileName, fileLength, linesToRead) {
	const resultsFileName = `${linesToRead}-${fileLength}`;

	await suite(
		`Reading ${linesToRead} lines from file with ${fileLength} lines`,

		add("RLL", async function() {
			return rll.read(fileName, linesToRead);
		}),

		add("SplitSlice", async function() {
			return new Promise((resolve) => {
				fs.readFile(fileName, "utf8", (error, file) => {
					if(error) {
						throw error;
					}
					resolve(file.split("\n").slice(0 - linesToRead).join("\n"));
				});
			});
		}),

		cycle(),
		complete(),

		save({ file: resultsFileName}),
	);

	console.log("");

	return JSON.parse(fs.readFileSync(`./benchmark/results/${resultsFileName}.json`));
}

async function main() {
	const table = {};

	for (const [fileName, fileLength] of files) {
		const row = {};
		for (const linesToRead of linesToReads) {
			const results = await runTest(fileName, fileLength, linesToRead);
			const winner = results.results.find((test) => test.name === results.slowest.name);
			row[linesToRead] = `${results.fastest.name} (${winner.percentSlower}%)`;
		}
		table[fileLength] = row;
	}

	console.log("File size X rows read");
	console.table(table);
}

main();
