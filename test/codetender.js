var t = require('tap'),
  fs = require('fs'),
  rimraf = require('rimraf'),
  fsExtra = require('node-fs-extra'),
  mkdirp = require('mkdirp'),
  path = require('path'),
  codetender = require('../bin/codetender.js');

// Make sure working directory is this folder:
process.chdir(__dirname); 

function checkFile(file) {

  if (!fs.existsSync(path.join(__dirname, file))) {
    return false;
  }
  
  var stat = fs.statSync(path.join(__dirname, file));

  return stat && stat.isFile();
}

function checkDir(file) {
  if (!fs.existsSync(path.join(__dirname, file))) {
    return false;
  }

  var stat = fs.statSync(path.join(__dirname, file));

  return stat && stat.isDirectory();
}

function checkContents(file, expected) {
  if (!checkFile(file)) {
    return false;
  }
  var contents = fs.readFileSync(path.join(__dirname, file), 'utf8');

  return contents === expected;
}

function cleanupNew(err) {
  rimraf(path.join(__dirname, 'output/test-new'), function() {
    if (err) {
      t.threw(err);
    }
  });
}

function cleanupReplace(err) {
  rimraf(path.join(__dirname, 'output/test-replace'), function() {
    if (err) {
      t.threw(err);
    }
  });
}

function testNew(t) {
  codetender.new({
    verbose: true,
    template: 'sample', 
    folder: './output/test-new',
    file: 'sample/codetender.json',
  }).then(function() {
    t.teardown(cleanupNew)
    t.plan(16);
    t.ok(checkFile('output/test-new/bar.js'), "foo replaced with bar");
    t.ok(checkDir('output/test-new/folder'), "sub replaced with folder");
    t.ok(checkContents('output/test-new/folder/bar-something.txt', 'This is a Served file in a folder to be renamed.'), "foo, CodeTender, and sub all replaced");
    t.ok(checkFile('output/test-new/before.txt'), "before script runs");
    t.notOk(checkDir('output/test-new/ignored-folder'), "ignored folders are removed");
    t.notOk(checkFile('output/test-new/ignore-file.txt'), "ignored files are removed");
    t.ok(checkContents('output/test-new/no-replace-file.txt', 'foo'), "noReplace files are skipped");
    t.ok(checkDir('output/test-new/noReplace-folder/sub', 'foo'), "noReplace folders are skipped");
    t.ok(checkContents('output/test-new/noReplace-folder/sub/foo.txt', 'foo'), "noReplace folder contents are skipped");
    t.ok(checkContents('output/test-new/before.txt', 'bar'), "before script works");
    t.ok(checkContents('output/test-new/after.txt', 'foo'), "after script works");
    t.ok(checkContents('output/test-new/README.md', '# This is a sample Served template.'), "README is processed");
    t.notOk(checkFile('output/test-new/delete-file.txt'), "delete files are removed");
    t.notOk(checkDir('output/test-new/delete-folder'), "delete folders are removed");
    t.notOk(checkFile('output/test-new/codetender-before.js'), "codetender-before is removed");
    t.notOk(checkFile('output/test-new/codetender-after.js'), "codetender-after is removed");
  }).catch(t.threw);
}

function testReplace(t) {
  var template = 'sample',
      config = {
        verbose: true,
        folder: './output/test-replace',
        file: 'sample/codetender.json',
        tokens: [
          {
            pattern: 'CodeTender',
            prompt: 'This should be ignored based on -f'
          },
          {
            pattern: 'foo',
            replacement: 'bar'
          },
          {
            pattern: 'sub',
            replacement: 'folder'
          }
        ]
      };

  mkdirp(config.folder).then(function () {
    // Copy from source to destination:
    fsExtra.copy(template, config.folder, function (err) {
      if (err) {
        t.threw(err);
      }
      else {
        mkdirp('./output/test-replace/.git').then(function (err) {
            fs.writeFile('./output/test-replace/.git/foo.txt', 'foo', function(err2) {
              if (err2) {
                cleanupReplace(err);
              }
              else
              {
                codetender.replace(config).then(function() {
                  t.teardown(cleanupReplace);
                  t.plan(7);
                  t.ok(checkContents('output/test-replace/README.md', '# This is a sample Served template.'), "README is processed");
                  t.ok(checkContents('output/test-replace/no-replace-file.txt', 'foo'), "noReplace files are skipped");
                  t.ok(checkFile('output/test-replace/bar.js'), "foo replaced with bar");
                  t.ok(checkDir('output/test-replace/folder'), "sub replaced with folder");
                  t.ok(checkContents('output/test-replace/.git/foo.txt', 'foo'), ".git is ignored");
                  t.notOk(checkFile('output/test-replace/delete-file.txt'), "delete files are removed");
                  t.notOk(checkDir('output/test-replace/delete-folder'), "delete folders are removed");
                }).catch(t.threw);
              }
            });
        }).catch(t.threw);
      }
    });
  }).catch(t.threw);
}

t.test('CodeTender new', testNew);

t.test('CodeTender replace', testReplace);