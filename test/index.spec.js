var rll = require('../index.js');
// var mock = require('mock-fs');

var expect = require('chai').expect;


// mock({
// 	'test/': {
// 		'numbered': '10\n9 9\n8 8\n7 7\n6 6\n5 5\n4 4\n3 3\n2 2\n1 1\n',
// 		'numbered_no_trailing_new_line': '10\n9 9\n8 8\n7 7\n6 6\n5 5\n4 4\n3 3\n2 2\n1 1'
// 	}
// });

describe('#equals', function() {
	it('return all lines when asked for more than the file has', function() {
		return rll.read('test/numbered', 15)
			.then((lines) => {
				var length = lines.split('\n').length;
				expect(length).to.equal(10 + 1);
			})
			// .catch(function(error) {
			// 	console.log(error);
			// })
	});

	it('return last line when asked for 1', function() {
		return rll.read('test/numbered', 1)
			.then((lines) => {
				var length = lines.split('\n').length;
				expect(length).to.equal(1 + 1);
			})
			// .catch(function(error) {
			// 	console.log(error);
			// })
	});

	it('return last 2 lines when asked for 2', function() {
		return rll.read('test/numbered', 2)
			.then((lines) => {
				var length = lines.split('\n').length;
				expect(length).to.equal(2 + 1);
			})
			// .catch(function(error) {
			// 	console.log(error);
			// })
	});

	it('return last 2 lines when asked for 2 and missing trailing new line', function() {
		return rll.read('test/numbered_no_trailing_new_line', 2)
			.then((lines) => {
				var length = lines.split('\n').length;
				expect(length).to.equal(2);
			})
			// .catch(function(error) {
			// 	console.log(error);
			// })
	});

});

			// .then((lines) => {
			// 	print_results(this.test.title, lines)
			// 	return lines;
			// })


var print_results = function(title, data) {
	console.log(JSON.stringify({
		title: title,
		encoded_data: JSON.stringify(data),
		data: data,
		length: data.split('\n').length,
		split: data.split('\n')
	}, null, 2));
}
