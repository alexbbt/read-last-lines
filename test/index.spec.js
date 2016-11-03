const rll = require('../index.js');
const expect = require('chai').expect;


describe('#equals', function() {
	it('return all lines when asked for more than the file has', function() {
		return rll.read('test/numbered', 15)
			.then((lines) => {
				var length = lines.trim().split('\n').length;
				expect(length).to.equal(10);
			})
	});

	it('return last line when asked for 1', function() {
		return rll.read('test/numbered', 1)
			.then((lines) => {
				var lines = lines.trim().split('\n').length;
				var length = lines.trim().length;
				expect(lines).to.equal(1);
				expect(length).to.equal(3);
			})
	});

	it('return last 2 lines when asked for 2', function() {
		return rll.read('test/numbered', 2)
			.then((lines) => {
				var length = lines.trim().split('\n').length;
				expect(length).to.equal(2);
			})
	});

	it('return last 2 lines when asked for 2 and missing trailing new line', function() {
		return rll.read('test/numbered_no_trailing_new_line', 2)
			.then((lines) => {
				var length = lines.trim().split('\n').length;
				expect(length).to.equal(2);
			})
	});

});

var print_results = function(title, data) {
	console.log(JSON.stringify({
		title: title,
		encoded_data: JSON.stringify(data),
		data: data,
		length: data.split('\n').length,
		split: data.split('\n')
	}, null, 2));
}
