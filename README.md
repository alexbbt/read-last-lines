# Read Last N Lines

[![NPM](https://nodei.co/npm/read-last-lines.png?compact=true)](https://nodei.co/npm/read-last-lines/)

Read in the last N lines of a file efficiently using node.js and fs. Used by [Signal Desktop](https://github.com/signalapp/Signal-Desktop), [Ghost CLI](https://github.com/TryGhost/Ghost-CLI), and others.

## Installation

```bash
npm install read-last-lines
```

## Usage

```javascript
const readLastLines = require('read-last-lines');

const lines = await readLastLines.read('path/to/file', 50);
console.log(lines);
```

An optional third argument sets the encoding (default `'utf8'`). Pass `'buffer'` to get a `Buffer` instead of a string.

```javascript
const buffer = await readLastLines.read('path/to/file', 50, 'buffer');
```

## Contributing

> More details can be found in [CONTRIBUTING.md](CONTRIBUTING.md)

1. Fork it on Github [https://github.com/alexbbt/read-last-lines](https://github.com/alexbbt/read-last-lines)
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request.
