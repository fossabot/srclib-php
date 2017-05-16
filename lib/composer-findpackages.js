var path = require('path')
var _ = require('underscore')
var Promise = require('bluebird')
var glob = require('glob')
var fs = Promise.promisifyAll(require('fs'))

module.exports = function(dir, ignores) {
  return new Promise(function (resolve, reject) {
    glob(path.join(dir, '**/composer.json'), { nocase: true, dot: true }, function (err, files) {
      if (err) {
        console.error('Error finding composer files:', err);
        process.exit(1);
        return reject(err)
      }
      return resolve(files)
    })
  })
  .then(function (files) {
    // check that files are not ignored
    if (ignores) {
      files = _.filter(files, function(file) {
        file = file.toLowerCase();
        for (var i = 0; i < ignores.length; i++) {
          if (file.indexOf(ignores[i]) >= 0) return false; // skip processing file
        }
        return true;
      });
    }
     
    if (files.length === 0) {
      return []
    } else {
      return Promise.map(files, function (file) {
        var dir_name = path.dirname(file);
        var all_files
        return fs.readFileAsync(file, {
          encoding: 'utf-8'
        })
        .tap(function () {
          return new Promise(function (resolve, reject) { // Get files
            glob(path.join(dir_name, '**/*.php'), {}, function (err, files) {
              console.error('Error finding php files:', err);
              process.exit(1);
              return reject(err)
            })
            all_files = files
            return resolve()
          })
        })
        .then(function (composer_json) {
          var project = JSON.parse(file);
          var dependencies = getProjectDependencies(project)
          return {
            name: project.name,
            version: project.version || 1.0, // no version in composer.json usually
            files: all_files,
            dependencies: dependencies,
            dir: dir_name
          };
        })
      })
    }
  })
}

function getProjectDependencies(project) {
  var dependencies = [];

  var version = project.version;
  var deps = project.require;

  for (var dep in deps) {
    var depVersion = deps[dep];
    dependencies.push({
      name: dep,
      version: depVersion || ''
    });
  }

  return dependencies
}

//for packages.config
function getPackageDependencies(file) {
    var allDependencies = [];
    var packageList = file.packages.package;
  _.each(packageList, function(pkg) {
    var pkgAttrs = pkg['$'];
    allDependencies.push({
      name: pkgAttrs.id,
      version: pkgAttrs.version || ''
    });
  });

  return allDependencies;
}