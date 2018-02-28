/* eslint-disable */

const rll = require("../src/index.js");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

const expect = chai.expect;
const assert = chai.assert;


describe("#equals", function() {
	it("return all lines when asked for more than the file has", function() {
		return rll.read("test/numbered", 15)
			.then((lines) => {
				let length = lines.split(/\n|\r/).length;
				expect(length).to.equal(10 + 1);
			});
	});

	it("return last line when asked for 1", function() {
		return rll.read("test/numbered", 1)
			.then((lines) => {
				let length = lines.split(/\n|\r/).length;
				let trimmedStringLength = lines.trim().length;
				expect(length).to.equal(1 + 1);
				expect(trimmedStringLength).to.equal(3);
			});
	});

	it("return last 2 lines when asked for 2", function() {
		return rll.read("test/numbered", 2)
			.then((lines) => {
				let length = lines.split(/\n|\r/).length;
				expect(length).to.equal(2 + 1);
			});
	});

	it("return last 2 lines when asked for 2 and missing trailing new line", function() {
		return rll.read("test/numbered_no_trailing_new_line", 2)
			.then((lines) => {
				let length = lines.split(/\n|\r/).length;
				expect(length).to.equal(2);
			});
	});

	it("Expect and error to be thrown if the file does not exist", function() {
		return assert.isRejected(rll.read("test/non_existant_file_name", 1), "file does not exist");
	});

	it("should the new line characters used by the file, when using non standard new line characters", function() {
		return rll.read("test/non_standard_new_lines", 30)
			.then((lines) => {
				let length = lines.split(/\n\r/).length;
				expect(length).to.equal(3 + 1);
			});
	});

	it("should return a buffer, when asked for", function() {
		return rll.read("test/utf8", 2, 'buffer')
			.then((lines) => {
				expect(lines).to.be.an.instanceOf(Buffer);
				expect(lines).to.have.lengthOf(163);
			});
	});

	it("should return binary encoding, when asked for", function() {
		return rll.read("test/utf8", 2, 'binary')
			.then((lines) => {
				expect(lines).to.be.a('string');
				expect(lines).to.have.string("\xe4\xb8\xad");
			});
	});

	it("should correctly read UTF-8 files", function() {
		return rll.read("test/utf8", 2)
			.then((lines) => {
				expect(lines).to.be.a('string');
				expect(lines).to.have.string("中文");
				expect(lines).to.have.string("español");
				expect(lines).to.have.string("português");
				expect(lines).to.have.string("日本語");
			});
	});
});
