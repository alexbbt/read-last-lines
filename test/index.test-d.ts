import {expectType, expectError} from 'tsd';

import readLastLines = require("../src");

expectType<Promise<any>>(readLastLines.read('foo', 50));
expectType<any>(await readLastLines.read('bar', 50));

expectError(await readLastLines.read('foo', 50));
expectError(await readLastLines.read(0, 50, 30));
