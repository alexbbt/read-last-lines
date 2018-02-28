# Testing

`npm test` to run all tests.

When adding new features please make sure to add a test which touches it.

If you find a bug, please add a test which breaks on this bug.

When debugging tests, it can be useful to add debugging to the test.

Temporarily add this function at the bottom of the test file.

``` JavaScript
let print_results = function(title, data) {
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
};
```

Then add this line inside each test to debug:

``` JavaScript
print_results(this.test.title, lines);
```

Forexample:

``` JavaScript
it("return all lines when asked for more than the file has", function() {
    return rll.read("test/numbered", 15)
        .then((lines) => {
            let length = lines.split(/\n|\r/).length;
            expect(length).to.equal(10 + 1);
            print_results(this.test.title, lines);
        });
});
```
