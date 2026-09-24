// Loads the engine files (src/01-09) into a vm context, as the browser would, and returns IX.
var fs = require('fs'), path = require('path'), vm = require('vm');
module.exports = function load() {
  var dir = path.join(__dirname, '..', 'src');
  var files = fs.readdirSync(dir).filter(function (f) { return /^0\d-.*\.js$/.test(f); }).sort();
  var ctx = vm.createContext({ console: console, Math: Math, JSON: JSON, Date: Date, Buffer: Buffer });
  files.forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f }); });
  return ctx.IX;
};
