// Loads the engine files (src/01-09) as the browser would (concatenated, in order) and returns DX.
// Evaluated in this context (not a vm sandbox, whose global lookups are slow) inside a function scope.
var fs = require('fs'), path = require('path'), vm = require('vm');
module.exports = function load() {
  var dir = path.join(__dirname, '..', 'src');
  var files = fs.readdirSync(dir).filter(function (f) { return /^0\d-.*\.js$/.test(f); }).sort();
  var code = files.map(function (f) { return fs.readFileSync(path.join(dir, f), 'utf8'); }).join('\n;\n');
  var fn = vm.runInThisContext('(function () {\n' + code + '\n;return DX; })', { filename: 'depth-engine.js' });
  return fn();
};
