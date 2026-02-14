/* eslint-disable no-console */
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { spawnSync } = require("child_process");

const rll = require("../src/index.js");
const fileLengths = require("./fileLengths.js");
const { legacyBytewise } = require("./strategies/legacy-bytewise.js");
const { chunkedReverse } = require("./strategies/chunked.js");

const QUICK_LINES = [50, 100, 500];
const FULL_LINES = [50, 100, 500, 1000, 20 * 1000];
const DEFAULT_CASE_TIMEOUT_MS = 60_000;
const SMALL_FIXTURES = [
	{ path: "test/numbered", label: "fixture-numbered", sizeType: "tiny" },
	{ path: "test/windows_new_lines", label: "fixture-windows-new-lines", sizeType: "tiny" },
	{ path: "test/utf8", label: "fixture-utf8", sizeType: "tiny" },
];

function readProfile() {
	const profile = process.env.RLL_BENCHMARK_PROFILE || "quick";
	if (profile !== "quick" && profile !== "full") {
		throw new Error(`Unsupported RLL_BENCHMARK_PROFILE value: ${profile}`);
	}
	return profile;
}

function selectGeneratedFiles(profile) {
	const entries = Object.entries(fileLengths).map(([filePath, lineCount]) => {
		const sizeType = lineCount < 10_000 ? "tiny" : (lineCount < 1_000_000 ? "medium" : "huge");
		return { path: filePath, label: path.basename(filePath), lineCount, sizeType };
	});

	if (profile === "quick") {
		return entries.slice(0, 2);
	}

	return entries;
}

async function splitSlice(filePath, maxLineCount, encoding = "utf8") {
	if (!Number.isFinite(maxLineCount)) {
		throw new TypeError("maxLineCount must be a finite number");
	}
	if (!Number.isInteger(maxLineCount)) {
		throw new TypeError("maxLineCount must be an integer");
	}
	if (maxLineCount <= 0) {
		return encoding === "buffer" ? Buffer.alloc(0) : "";
	}

	const file = await fsp.readFile(filePath);
	const text = file.toString("utf8");
	const normalized = text.endsWith("\n") ? text.slice(0, -1) : text;
	const lines = normalized.length === 0 ? [] : normalized.split("\n");
	const selected = lines.slice(0 - maxLineCount).join("\n");
	const buffer = Buffer.from(selected, "utf8");

	if (encoding === "buffer") {
		return buffer;
	}
	return buffer.toString(encoding);
}

async function runTail(filePath, maxLineCount) {
	const result = spawnSync("tail", ["-n", String(maxLineCount), filePath], {
		encoding: "utf8",
		maxBuffer: 1024 * 1024 * 64,
	});
	if (result.error) {
		throw result.error;
	}
	if (result.status !== 0) {
		throw new Error(result.stderr || `tail exited with ${result.status}`);
	}
	return result.stdout;
}

function withTimeout(promise, timeoutMs, label) {
	let timer;
	const timeoutPromise = new Promise((_, reject) => {
		timer = setTimeout(() => {
			reject(new Error(`Timed out after ${timeoutMs}ms (${label})`));
		}, timeoutMs);
	});

	return Promise.race([promise, timeoutPromise]).finally(() => {
		clearTimeout(timer);
	});
}

function supportsTail() {
	const check = spawnSync("tail", ["--version"], { encoding: "utf8" });
	// BSD tail exits non-zero for --version, but command exists.
	return !check.error;
}

async function measureStrategy(strategyName, fn, scenario, iterations, caseTimeoutMs) {
	const times = [];
	const memoryDeltas = [];
	let sample;

	for (let i = 0; i < iterations; i++) {
		if (global.gc) {
			global.gc();
		}

		const rssBefore = process.memoryUsage().rss;
		const start = process.hrtime.bigint();
		sample = await withTimeout(
			fn(scenario.path, scenario.linesToRead, "utf8"),
			caseTimeoutMs,
			`${strategyName} on ${scenario.label} (${scenario.linesToRead} lines)`
		);
		const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
		const rssAfter = process.memoryUsage().rss;

		times.push(elapsedMs);
		memoryDeltas.push(rssAfter - rssBefore);
	}

	const avgMs = times.reduce((sum, v) => sum + v, 0) / times.length;
	const minMs = Math.min(...times);
	const maxMs = Math.max(...times);
	const avgRssDeltaBytes = Math.round(memoryDeltas.reduce((sum, v) => sum + v, 0) / memoryDeltas.length);

	return {
		name: strategyName,
		avgMs,
		minMs,
		maxMs,
		avgRssDeltaBytes,
		sampleLength: typeof sample === "string" ? sample.length : sample.byteLength,
	};
}

async function runScenario(scenario, strategies, iterations, caseTimeoutMs) {
	const results = [];
	for (const strategy of strategies) {
		try {
			const result = await measureStrategy(strategy.name, strategy.run, scenario, iterations, caseTimeoutMs);
			results.push(result);
		} catch (error) {
			results.push({
				name: strategy.name,
				failed: true,
				error: error.message,
			});
			console.warn(`Strategy failed: ${strategy.name} -> ${error.message}`);
		}
	}

	results.sort((a, b) => {
		if (a.failed && b.failed) {
			return a.name.localeCompare(b.name);
		}
		if (a.failed) {
			return 1;
		}
		if (b.failed) {
			return -1;
		}
		return a.avgMs - b.avgMs;
	});

	const nonFailedResults = results.filter((result) => !result.failed);
	return {
		scenario,
		results,
		fastest: nonFailedResults[0] ? nonFailedResults[0].name : null,
		slowest: nonFailedResults[nonFailedResults.length - 1] ? nonFailedResults[nonFailedResults.length - 1].name : null,
	};
}

function formatMarkdown(report) {
	const lines = [];
	lines.push("# Benchmark Report");
	lines.push("");
	lines.push(`- Profile: \`${report.profile}\``);
	lines.push(`- Iterations per strategy: \`${report.iterations}\``);
	lines.push(`- Generated at: \`${report.generatedAt}\``);
	lines.push("");
	lines.push("## Scenario Results");
	lines.push("");

	for (const entry of report.scenarios) {
		const scenario = entry.scenario;
		lines.push(`### ${scenario.label} (${scenario.linesToRead} lines)`);
		lines.push("");
		lines.push("| Strategy | Avg ms | Min ms | Max ms | Avg RSS delta (bytes) |");
		lines.push("| --- | ---: | ---: | ---: | ---: |");
		for (const result of entry.results) {
			if (result.failed) {
				lines.push(`| ${result.name} | timeout/error | timeout/error | timeout/error | timeout/error |`);
				continue;
			}
			lines.push(`| ${result.name} | ${result.avgMs.toFixed(3)} | ${result.minMs.toFixed(3)} | ${result.maxMs.toFixed(3)} | ${result.avgRssDeltaBytes} |`);
		}
		lines.push("");
	}

	return `${lines.join("\n")}\n`;
}

async function main() {
	const profile = readProfile();
	const iterations = Number(process.env.RLL_BENCHMARK_ITERATIONS || (profile === "quick" ? 3 : 5));
	const caseTimeoutMs = Number(process.env.RLL_BENCHMARK_CASE_TIMEOUT_MS || DEFAULT_CASE_TIMEOUT_MS);
	const linesToRead = profile === "quick" ? QUICK_LINES : FULL_LINES;
	const generatedFiles = selectGeneratedFiles(profile);

	const scenarios = [];
	for (const fileEntry of generatedFiles) {
		for (const lines of linesToRead) {
			scenarios.push({
				path: fileEntry.path,
				label: `${fileEntry.label}-${fileEntry.lineCount || fileEntry.sizeType}`,
				linesToRead: lines,
				sizeType: fileEntry.sizeType,
			});
		}
	}

	for (const fixture of SMALL_FIXTURES) {
		for (const lines of [1, 3, 10]) {
			scenarios.push({
				path: fixture.path,
				label: fixture.label,
				linesToRead: lines,
				sizeType: fixture.sizeType,
			});
		}
	}

	const strategies = [
		{ name: "CurrentRLL", run: rll.read },
		{ name: "LegacyBytewise", run: legacyBytewise },
		{ name: "ChunkedReverse", run: chunkedReverse },
		{ name: "SplitSlice", run: splitSlice },
	];

	if (supportsTail()) {
		strategies.push({
			name: "Tail",
			run: async (filePath, maxLineCount) => runTail(filePath, maxLineCount),
		});
	}

	const scenarioResults = [];
	for (const scenario of scenarios) {
		console.log(`Running benchmark for ${scenario.path} (${scenario.linesToRead} lines)`);
		const result = await runScenario(scenario, strategies, iterations, caseTimeoutMs);
		scenarioResults.push(result);
	}

	const report = {
		profile,
		iterations,
		caseTimeoutMs,
		generatedAt: new Date().toISOString(),
		strategies: strategies.map((s) => s.name),
		scenarios: scenarioResults,
	};

	const resultsDir = path.join("benchmark", "results");
	await fsp.mkdir(resultsDir, { recursive: true });

	const stamp = new Date().toISOString().replace(/[:.]/g, "-");
	const jsonFile = path.join(resultsDir, `report-${stamp}.json`);
	const latestJson = path.join(resultsDir, "latest.json");
	const markdownFile = path.join(resultsDir, `report-${stamp}.md`);
	const latestMarkdown = path.join(resultsDir, "latest.md");

	await fsp.writeFile(jsonFile, JSON.stringify(report, null, 2), "utf8");
	await fsp.writeFile(latestJson, JSON.stringify(report, null, 2), "utf8");
	const markdown = formatMarkdown(report);
	await fsp.writeFile(markdownFile, markdown, "utf8");
	await fsp.writeFile(latestMarkdown, markdown, "utf8");

	console.log(`Saved benchmark report to ${jsonFile}`);
	console.log(`Saved benchmark summary to ${markdownFile}`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
