// Copyright 2014 Simon Lydell
// X11 (“MIT”) Licensed. (See LICENSE.)

var fs     = require("fs")
var expect = require("chai").expect

var run = require("../")

var fn = function() {}


describe("run", function() {

  it("is a function", function() {
    expect(run).to.be.a("function")
  })


  it("requires a cli function", function() {
    expect(function() { run() }).to.throw("cli function")
    expect(function() { run(null) }).to.throw("cli function")
    expect(function() { run("-p") }).to.throw("cli function")

    expect(function() { run(fn) }).not.to.throw("cli function")
  })


  it("requires a callback function", function() {
    expect(function() { run(fn) }).to.throw("callback function")
    expect(function() { run(fn, null) }).to.throw("callback function")
    expect(function() { run(fn, "-p") }).to.throw("callback function")

    expect(function() { run(fn, fn) }).not.to.throw("callback function")
  })


  it("requires all argv arguments to be strings", function() {
    expect(function() { run(fn, null, fn) }).to.throw("string")
    expect(function() { run(fn, 1, fn) }).to.throw("string")
    expect(function() { run(fn, "-p", 1, fn) }).to.throw("string")
    expect(function() { run(fn, "-p", fn, fn) }).to.throw("string")

    expect(function() { run(fn, "-p", fn) }).not.to.throw("string")
    expect(function() { run(fn, "-p", "whatever", fn) }).not.to.throw("string")
  })


  it("always sets the first two elements of process.argv", function() {
    var cli = function(process) {
      expect(process.argv).to.have.length(2)
      expect(process.argv[0]).to.equal("node")
    }
    run(cli, fn)
  })


  it("concats string arguments to process.argv", function() {
    var cli = function(process) {
      expect(process.argv.slice(2)).to.eql(["-p", "foo", "--long-name", "-xvf", "--", "bar"])
    }
    run(cli, "-p", "foo", "--long-name", "-xvf", "--", "bar", fn)
  })


  it("throws an error if process.exit is used", function() {
    var cli = function(process) {
      process.exit()
    }
    expect(function() { run(cli, fn) }).to.throw("not testable")
  })


  it("allows to customize the process", function() {
    var cli = function(process) {
      expect(process.argv[1]).to.equal("foo-cli")
      expect(process.argv[2]).to.equal("arg")
      expect(process.foo).to.be.true
    }
    var customize = function(process) {
      process.argv[1] = "foo-cli"
      process.foo = true
    }
    run(cli, customize, "arg", fn)
  })


  it("runs the callback with defaults for stdout, stderr and the exit code", function(done) {
    var cli = function(process, done) {
      setImmediate(done)
    }
    run(cli, function(stdout, stderr, code) {
      expect(stdout).to.equal("")
      expect(stderr).to.equal("")
      expect(code).to.equal(0)
      done()
    })
  })


  it("runs the callback with stdout, stderr and the exit code", function(done) {
    var cli = function(process, done) {
      setImmediate(function() {
        process.stdout.write("Hello, ")
        process.stderr.write("error")
        process.stdout.write("World!")
        done(1)
      })
    }
    run(cli, function(stdout, stderr, code) {
      expect(stdout).to.equal("Hello, World!")
      expect(stderr).to.equal("error")
      expect(code).to.equal(1)
      done()
    })
  })


  it("provides an empty default stdin", function(done) {
    var cli = function(process, done) {
      process.stdin.setEncoding("utf8")
      var chunks = []
      process.stdin.on("readable", function() {
        chunks.push(process.stdin.read())
      })
      process.stdin.on("end", function() {
        expect(chunks).to.eql([])
        done()
      })
    }
    run(cli, function() {
      done()
    })
  })


  it("allows to send in a string as stdin using run.stdin", function(done) {
    var cli = function(process, done) {
      expect(process.argv[2]).to.equal("arg")
      process.stdin.setEncoding("utf8")
      var chunks = []
      process.stdin.on("readable", function() {
        chunks.push(process.stdin.read())
      })
      process.stdin.on("end", function() {
        expect(chunks).to.eql(["Hello, World!"])
        done()
      })
    }
    run(cli, "arg", run.stdin("Hello, World!"), function() {
      done()
    })
  })


  it("allows to send in an array of chunks as stdin using run.stdin", function(done) {
    var cli = function(process, done) {
      expect(process.argv[2]).to.equal("arg")
      process.stdin.setEncoding("utf8")
      var chunks = []
      process.stdin.on("readable", function() {
        chunks.push(process.stdin.read())
      })
      process.stdin.on("end", function() {
        expect(chunks).to.eql(["Hello", ", ", "World!"])
        done()
      })
    }
    run(cli, "arg", run.stdin(["Hello", ", ", "World!"]), function() {
      done()
    })
  })


  it("allows to send in stdin using fs.createReadStream", function(done) {
    var cli = function(process, done) {
      expect(process.argv[2]).to.equal("arg")
      process.stdin.setEncoding("utf8")
      var content = ""
      process.stdin.on("readable", function() {
        content += process.stdin.read()
      })
      process.stdin.on("end", function() {
        expect(content).to.equal("Hello,\nWorld!\n")
        done()
      })
    }
    run(cli, "arg", fs.createReadStream("test/testfile.txt"), function() {
      done()
    })
  })


  it("allows to use classic streams", function(done) {
    var cli = function(process, done) {
      expect(process.argv[2]).to.equal("arg")
      var chunks = []
      process.stdin.resume()
      process.stdin.setEncoding("utf8")
      process.stdin.on("data", function(chunk) {
        chunks.push(chunk)
      })
      process.stdin.on("end", function() {
        expect(chunks).to.eql(["Hello", ", ", "World!"])
        done()
      })
    }
    run(cli, "arg", run.stdin(["Hello", ", ", "World!"]), function() {
      done()
    })
  })


  it("allows to pipe stdin directly into stdout", function(done) {
    var cli = function(process, done) {
      process.stdin.pipe(process.stdout)
      process.stdin.on("end", done)
    }
    run(cli, run.stdin(["Hello", ", ", "World!"]), function(stdout) {
      expect(stdout).to.equal("Hello, World!")
      done()
    })
  })

})
