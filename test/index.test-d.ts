import { expectType } from "tsd";

import readLastLines = require("../src");

expectType<{ read: typeof readLastLines.read }>(readLastLines);

expectType<Promise<string>>(readLastLines.read("foo.txt", 50));
expectType<Promise<string>>(readLastLines.read("foo.txt", 50, "utf8"));
expectType<Promise<string>>(readLastLines.read("foo.txt", 50, "hex"));
expectType<Promise<string>>(readLastLines.read("foo.txt", 0));

expectType<Promise<Buffer>>(readLastLines.read("foo.txt", 50, "buffer"));
