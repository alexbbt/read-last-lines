const rll = require("../index.js");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

const expect = chai.expect;
const assert = chai.assert;


describe("#equals", function() {
	it("return all lines when asked for more than the file has", function() {
		return rll.read("test/numbered", 15)
			.then((lines) => {
				var length = lines.split(/\n|\r/).length;
				expect(length).to.equal(10 + 1);
			})
	});

	it("return last line when asked for 1", function() {
		return rll.read("test/numbered", 1)
			.then((lines) => {
				var length = lines.split(/\n|\r/).length;
				var trimmedStringLength = lines.trim().length;
				expect(length).to.equal(1 + 1);
				expect(trimmedStringLength).to.equal(3);
			})
	});

	it("return last 2 lines when asked for 2", function() {
		return rll.read("test/numbered", 2)
			.then((lines) => {
				var length = lines.split(/\n|\r/).length;
				expect(length).to.equal(2 + 1);
			})
	});

	it("return last 2 lines when asked for 2 and missing trailing new line", function() {
		return rll.read("test/numbered_no_trailing_new_line", 2)
			.then((lines) => {
				var length = lines.split(/\n|\r/).length;
				expect(length).to.equal(2);
			})
	});

	it("Expect and error to be thrown if the file does not exist", function() {
		return assert.isRejected(rll.read("test/non_existant_file_name", 1), "file does not exist");
	});

	it("should the new line characters used by the file, when using non standard new line characters", function() {
		return rll.read("test/non_standard_new_lines", 30)
			.then((lines) => {
				var length = lines.split(/\n\r/).length;
				expect(length).to.equal(3 + 1);
			})
	});

});

var print_results = function(title, data) {
	console.log(JSON.stringify({
		title: title,
		encoded_data: JSON.stringify(data),
		data: data,
		lines: data.split(/\n|\r/).length,
		split: data.split(/\n|\r/),
		trim: data.trim(),
		length: data.length,
		trimmed_length: data.trim().length
	}, null, 2));
}
// var test = this.test;
// print_results(test.title, lines);
