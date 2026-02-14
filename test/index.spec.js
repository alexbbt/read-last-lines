/* eslint-disable */

const os = require("os");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");

const rll = require("../src/index.js");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

const expect = chai.expect;
const assert = chai.assert;

function countLogicalLines(data) {
	if (data.length === 0) {
		return 0;
	}

	let normalized = data.replace(/\r\n/g, "\n");
	if (normalized.endsWith("\n")) {
		normalized = normalized.slice(0, -1);
	}

	if (normalized.length === 0) {
		return 0;
	}

	return normalized.split("\n").length;
}

describe("#read", function() {
	it("returns all lines when asked for more than the file has", async function() {
		const lines = await rll.read("test/numbered", 15);
		expect(countLogicalLines(lines)).to.equal(10);
	});

	it("returns all lines when asked for exactly the file line count", async function() {
		const lines = await rll.read("test/numbered", 10);
		expect(countLogicalLines(lines)).to.equal(10);
	});

	it("returns last line when asked for 1", async function() {
		const lines = await rll.read("test/numbered", 1);
		expect(countLogicalLines(lines)).to.equal(1);
		expect(lines.trim()).to.equal("1 1");
	});

	it("returns last 2 lines when asked for 2", async function() {
		const lines = await rll.read("test/numbered", 2);
		expect(countLogicalLines(lines)).to.equal(2);
		expect(lines.trim()).to.equal("2 2\n1 1");
	});

	it("returns last 2 lines when missing trailing newline", async function() {
		const lines = await rll.read("test/numbered_no_trailing_new_line", 2);
		expect(countLogicalLines(lines)).to.equal(2);
		expect(lines).to.equal("2 2\n1 1");
	});

	it("returns empty string for maxLineCount of 0", async function() {
		const lines = await rll.read("test/numbered", 0);
		expect(lines).to.equal("");
	});

	it("returns empty string for negative maxLineCount", async function() {
		const lines = await rll.read("test/numbered", -5);
		expect(lines).to.equal("");
	});

	it("coerces non-finite maxLineCount values to current baseline behavior", async function() {
		const nanResult = await rll.read("test/numbered", Number.NaN);
		const infinityResult = await rll.read("test/numbered", Number.POSITIVE_INFINITY);
		expect(countLogicalLines(nanResult)).to.equal(10);
		expect(countLogicalLines(infinityResult)).to.equal(10);
	});

	it("coerces string and fractional maxLineCount values to current baseline behavior", async function() {
		const stringResult = await rll.read("test/numbered", "2");
		const fractionalResult = await rll.read("test/numbered", 1.5);
		expect(countLogicalLines(stringResult)).to.equal(2);
		expect(countLogicalLines(fractionalResult)).to.equal(2);
	});

	it("throws if the file does not exist", async function() {
		await assert.isRejected(rll.read("test/non_existant_file_name", 1), "file does not exist");
	});

	it("rejects for unreadable files", async function() {
		if (process.platform === "win32") {
			this.skip();
			return;
		}

		const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "rll-unreadable-"));
		const tempFile = path.join(tempDir, "blocked.txt");
		await fsp.writeFile(tempFile, "a\nb\nc\n", "utf8");
		await fsp.chmod(tempFile, 0o000);

		try {
			await assert.isRejected(rll.read(tempFile, 1), /EACCES|EPERM/);
		} finally {
			await fsp.chmod(tempFile, 0o644);
			await fsp.unlink(tempFile);
			await fsp.rmdir(tempDir);
		}
	});

	it("works with windows new lines", async function() {
		const lines = await rll.read("test/windows_new_lines", 10);
		expect(countLogicalLines(lines)).to.equal(10);
	});

	it("keeps blank lines and does not exceed requested line count (issue #41)", async function() {
		const lines = await rll.read("test/issue_41_repro", 3);
		expect(countLogicalLines(lines)).to.equal(3);
		expect(lines).to.not.contain("bb");
	});

	it("returns a buffer when requested", async function() {
		// Read the whole file because the length changes on windows git.
		// see: https://github.com/alexbbt/read-last-lines/issues/22#issuecomment-573868249
		const wholeFileAsBuffer = fs.readFileSync("test/utf8");
		const lines = await rll.read("test/utf8", 2, "buffer");
		expect(lines).to.be.an.instanceOf(Buffer);
		expect(lines).to.have.lengthOf(wholeFileAsBuffer.length);
	});

	it("returns binary encoding when requested", async function() {
		const lines = await rll.read("test/utf8", 2, "binary");
		expect(lines).to.be.a("string");
		expect(lines).to.have.string("\xe4\xb8\xad");
	});

	it("correctly reads UTF-8 files", async function() {
		const lines = await rll.read("test/utf8", 2);
		expect(lines).to.be.a("string");
		expect(lines).to.have.string("中文");
		expect(lines).to.have.string("español");
		expect(lines).to.have.string("português");
		expect(lines).to.have.string("日本語");
	});

	it("errors if the encoding is invalid", async function() {
		await assert.isRejected(rll.read("test/numbered", 2, "bad-encoding"), "Unknown encoding: bad-encoding");
	});
});
