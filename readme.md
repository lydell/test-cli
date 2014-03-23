Overview [![Build Status](https://travis-ci.org/lydell/test-cli.png?branch=master)](https://travis-ci.org/lydell/test-cli)
========

Test CLI applications (that are written a certain way).

```js
var assert = require("assert")
var run    = require("test-cli")
var stdin  = run.stdin

function cli(process, done) {
  if (process.argv[2] === "--help") {
    process.stdout.write("Like “cat”, except it only works with stdin.")
    return done(-1)
  }
  process.stdin.pipe(process.stdout)
  process.stdin.on("end", done)
}

var dog = run.bind(null, cli)

dog("--help", function(stdout, stderr, code) {
  assert.equal(stdout, "Like “cat”, except it only works with stdin.")
  assert.equal(stderr, "")
  assert.equal(code, -1)
})

dog(stdin("foo"), function(stdout, stderr, code) {
  assert.equal(stdout, "foo")
  assert.equal(stderr, "")
  assert.equal(code, 0)
})
```


Installation
============

`npm install test-cli`

```js
var run = require("test-cli")
```


Philosophy
==========

Consider the example in the overview above. The directory structure for the
“dog” program could look like the following:

- dog/
  - bin/
    - dog
  - lib/
    - cli.js
  - test/
    - dog.js
  - package.json

bin/dog looks like the following:

```
#!/usr/bin/env node
require("../lib/cli")(process, process.exit)
```

It’s really simple. It `require`s the CLI function and runs it with the real
`process` and `process.exit` as a callback.

lib/cli.js simply exports the function called `cli` in the example in the
overview.

```js
module.exports = function cli(process, done) {
  // ...
}
```

This way we achieve three important things:

- We can `require` our cli as a module, and thus run it programatically. That’s
  a lot simpler, faster and more reliable than spawning the cli as a child
  process or running it in the shell before running the tests.
- We can fake the `process` to provide the argv and stdin we need.
- By not using `process.exit()` directly, but `done()` instead, we can hook up
  a callback to run after the cli, where we can assert that things went as
  expected. Just remember to end the cli function using `return` or whatever,
  just like any old async function.

What `run` does, is that it takes a cli function as the above example and runs
it with a fake `process`. The following properties are supported:

- `argv`. The first two are automatically set; The rest are provided by you.
- `stdin`. Empty by default, but can be provided by you.
- `stdout` and `stderr`. Their contents are passed to `run`s callback for
  inspection.
- `exit`. It throws an error. Do not use it, because it is not testable.

If you need anything more of the `process` object, that’s up to you. There is a
hook to modify it in whatever way you like.

test/cli.js looks like this:

```js
var run = require("test-cli")
var stdin = run.stdin
var cli = require("../cli")
var dog = run.bind(null, cli)

dog("--help", ...) // See the example in the overview.
```

The idea is that your test code should look a lot like the command line, staying
as close to the actual end user experience as possible.

```
# shell
$ my-cli -f -o output.file file1 file2 <file3
```
```js
// test code
myCli("-f", "-o", "output.file", "file1", "file2", fs.createReadStream("file3"),
  function(stdin, stdout, code) {
    // ...
  }
)
```


Usage
=====

### `run(cli, [customizeProcess], ...argv, [stdin], callback)` ###

`run` will run the function `cli` with a fake `process` and a callback.

`customizeProcess(process)` is an optional function that lets you modify the
fake `process` object, in case you need something that is not faked by default.

`stdin` is an optional readable stream that will be used as stdin. To pass a
simple string as stdin, you can use `run.stdin()`. To pass a file, just like
`<file` in the shell, you can use `fs.createReadStream()`.

`callback(stdout, stderr, code)` is run with the contents of stdout and stderr
(or empty strings if nothing was written to them), as well as the exit code
given passed to `cli`’s callback (or `0` if none was passed).

The remaining arguments are strings that are put in `process.argv[2]` and
onwards.

### `run.stdin(chunks)` ###

Creates a simple readable stream from which you can read `chunks`. `chunks` is
either a string, which will be pushed all at once when the stream is read, or
an array of strings, where each string is pushed one at a time.


License
=======

[The X11 (“MIT”) License](LICENSE).
