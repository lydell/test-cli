// Copyright 2014 Simon Lydell
// X11 (“MIT”) Licensed. (See LICENSE.)

var stream = require("stream")
var util   = require("util")


function run(/* cli, [customizeProcess], ...argv, [stdin], callback */) {
  var args = Array.prototype.slice.call(arguments)

  var cli = args.shift()
  if (typeof cli !== "function") {
    throw new TypeError("A cli function is required.")
  }

  var callback = args.pop()
  if (typeof callback !== "function") {
    throw new TypeError("A callback function is required.")
  }

  var stdin
  if (args[args.length-1] instanceof stream.Readable) {
    stdin = args.pop()
  } else {
    stdin = new SimpleReadableStream([])
  }

  var customizeProcess
  if (typeof args[0] === "function") {
    customizeProcess = args.shift()
  }

  if (!args.every(function(arg) { return typeof arg === "string" })) {
    throw new TypeError("The remaining arguments must all be strings.")
  }

  var process = {
    stdin:  stdin,
    stdout: new SimpleWritableStream(),
    stderr: new SimpleWritableStream(),
    argv: ["node", "/path/to/cli"].concat(args),
    exit: function() {
      throw new Error("Don’t use `process.exit()` in your cli function—it is not testable!")
    }
  }

  if (customizeProcess) {
    customizeProcess(process)
  }

  cli(process, function(exitCode) {
    callback(process.stdout._string, process.stderr._string, exitCode || 0)
  })
}

run.stdin = function(chunks) {
  return new SimpleReadableStream(chunks)
}


function SimpleReadableStream(chunks) {
  stream.Readable.call(this)
  this._chunks = (Array.isArray(chunks) ? chunks : [chunks])
}
util.inherits(SimpleReadableStream, stream.Readable)

SimpleReadableStream.prototype._read = function() {
  setImmediate(function() {
    if (this._chunks.length > 0) {
      this.push(new Buffer( this._chunks.shift() ))
    } else {
      this.push(null)
    }
  }.bind(this))
}


function SimpleWritableStream() {
  stream.Writable.call(this, {decodeStrings: false})
  this._string = ""
}
util.inherits(SimpleWritableStream, stream.Writable)

SimpleWritableStream.prototype._write = function(chunk, encoding, callback) {
  this._string += chunk
  callback(null)
}


module.exports = run
