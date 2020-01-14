/* eslint-disable */

const rll = require("../src/index.js");

const fs = require("fs");

const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

const expect = chai.expect;
const assert = chai.assert;


describe("#read", function() {
	it("return all lines when asked for more than the file has", function() {
		return rll.read("test/numbered", 15)
			.then((lines) => {
				let length = lines.split(/\n/).length;
				expect(length).to.equal(10 + 1);
			});
	});

	it("return last line when asked for 1", function() {
		return rll.read("test/numbered", 1)
			.then((lines) => {
				let length = lines.split(/\n/).length;
				let trimmedStringLength = lines.trim().length;
				expect(length).to.equal(1 + 1);
				expect(trimmedStringLength).to.equal(3);
			});
	});

	it("return last 2 lines when asked for 2", function() {
		return rll.read("test/numbered", 2)
			.then((lines) => {
				let length = lines.split(/\n/).length;
				expect(length).to.equal(2 + 1);
			});
	});

	it("return last 2 lines when asked for 2 and missing trailing new line", function() {
		return rll.read("test/numbered_no_trailing_new_line", 2)
			.then((lines) => {
				let length = lines.split(/\n/).length;
				expect(length).to.equal(2);
			});
	});

	it("Expect and error to be thrown if the file does not exist", function() {
		return assert.isRejected(rll.read("test/non_existant_file_name", 1), "file does not exist");
	});

	it("should work with windows new lines", function() {
		return rll.read("test/windows_new_lines", 10)
			.then((lines) => {
				let length = lines.split(/\r\n/).length;
				expect(length).to.equal(10 + 1);
			});
	});

	it("should return a buffer, when asked for", function() {
		// Read the whole file because the length changes on windows git.
		// see: https://github.com/alexbbt/read-last-lines/issues/22#issuecomment-573868249
		const wholeFileAsBuffer = fs.readFileSync("test/utf8");

		return rll.read("test/utf8", 2, "buffer")
			.then((lines) => {
				expect(lines).to.be.an.instanceOf(Buffer);
				expect(lines).to.have.lengthOf(wholeFileAsBuffer.length);
			});
	});

	it("should return binary encoding, when asked for", function() {
		return rll.read("test/utf8", 2, "binary")
			.then((lines) => {
				expect(lines).to.be.a("string");
				expect(lines).to.have.string("\xe4\xb8\xad");
			});
	});

	it("should correctly read UTF-8 files", function() {
		return rll.read("test/utf8", 2)
			.then((lines) => {
				expect(lines).to.be.a("string");
				expect(lines).to.have.string("中文");
				expect(lines).to.have.string("español");
				expect(lines).to.have.string("português");
				expect(lines).to.have.string("日本語");
			});
	});

	it("should error if the encoding is invalid", function() {
		return assert.isRejected(rll.read("test/numbered", 2, "bad-encoding"), "Unknown encoding: bad-encoding");
	});
});
