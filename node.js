
var FS = require("fs");
var PATH = require("path");

var MontageBoot = require("./montage");

var Require = require("./require/require");
var Promise = require("./core/promise");
var URL = require("./core/url");

var jsdom = require("jsdom").jsdom;
var Node = require("jsdom").level(1).Node;
var domToHtml = require("jsdom/lib/jsdom/browser/domtohtml").domToHtml;

exports.bootstrap = function (callback) {
    var command = process.argv.slice(0, 3);
    var args = process.argv.slice(2);
    var program = args.shift();
    FS.realpath(program, function (error, program) {
        if (error) {
            throw new Error(error);
        }
        findPackage(program, function (error, directory) {
            if (error === "Can't find package") {
                loadFreeModule(program, command, args);
            } else if (error) {
                throw new Error(error);
            } else {
                loadPackagedModule(directory, program, command, args);
            }
        });
    });
};

var findPackage = function (path, callback) {
    var directory = PATH.dirname(path);
    if (directory === path)
        return callback("Can't find package");
    var packageJson = PATH.join(directory, "package.json");
    FS.stat(path, function (error, stat) {
        if (error) callback(error);
        if (stat.isFile()) {
            callback(null, directory);
        } else {
            findPackage(directory, callback);
        }
    });
}

var loadFreeModule = function (program, command, args) {
    throw new Error("Can't load module that is not in a package");
};

var loadPackagedModule = function (directory, program, command, args) {
    MontageBoot.loadPackage(directory)
    .then(function (require) {
        var id = program.slice(directory.length + 1);
        return require.async(id);
    })
    .end();
};

MontageBoot.loadPackage = function (location, config) {
    var config = {};

    config.location = URL.resolve(Require.getLocation(), location + '/');

    // setup the reel loader
    config.makeLoader = function (config) {
        return MontageBoot.ReelLoader(
            config,
            Require.makeLoader(config)
        );
    };

    // setup serialization compiler
    config.makeCompiler = function (config) {
        return MontageBoot.TemplateCompiler(
            config,
            MontageBoot.SerializationCompiler(
                config,
                Require.makeCompiler(config)
            )
        );
    };

    return Require.loadPackage(config.location, config);
};

MontageBoot.TemplateLoader = function (config, load) {
    return function(id, module) {
        var html = id.match(/(.*\/)?(?=[^\/]+\.html$)/);
        var serialization = id.match(/(?=[^\/]+\.json$)/); // XXX this is not necessarily a strong indicator of a serialization alone
        if (html) {
            return load(id, module)
            .then(function () {
                module.dependencies = parseHtmlDependencies(module.text, module.location);
                return module;
            });
        } else if (serialization) {
            return load(id, module)
            .then(function () {
                module.dependencies = collectSerializationDependencies(module.text, []);
                return module;
            });
        } else {
            return load(id, module);
        }
    };
};

// add the TemplateLoader to the middleware chain
Require.makeLoader = (function (makeLoader) {
    return function (config) {
        return MontageBoot.TemplateLoader(config, makeLoader(config));
    };
})(Require.makeLoader);

MontageBoot.JsonCompiler = function (config, compile) {
    return function (module) {
        var json = module.id.match(/\.json$/);
        if (json) {
            module.exports = JSON.parse(module.text);
            return module;
        } else {
            return compile(module);
        }
    };
};

Require.makeCompiler = (function (makeCompiler) {
    return function (config) {
        return MontageBoot.JsonCompiler(config, makeCompiler(config));
    };
})(Require.makeCompiler);

var parseHtmlDependencies = function (text, location) {
    var dependencies = [];
    var document = jsdom(text, null, {
        "features": {
            "FetchExternalResources": false,
            "ProcessExternalResources": false
        }
    });
    collectHtmlDependencies(document, dependencies);
    return dependencies;
};

var collectHtmlDependencies = function (document, dependencies) {
    visit(document, function (element) {
        if (element.nodeType == Node.ELEMENT_NODE) {
            if (element.tagName === "SCRIPT") {
                if (element.getAttribute("type") === "text/montage-serialization") {
                    collectSerializationDependencies(getText(element), dependencies);
                }
            } else if (element.tagName === "LINK") {
                if (element.getAttribute("type") === "text/montage-serialization") {
                    dependencies.push(element.getAttribute("href"));
                }
            }
        }
    });
};

function visit(element, visitor) {
    var pruned;
    var prune = function () {
        pruned = true;
    };
    visitor(element, prune);
    if (pruned) {
        return;
    }
    element = element.firstChild;
    while (element) {
        visit(element, visitor);
        element = element.nextSibling;
    }
}

function getText(element) {
    return domToHtml(element._childNodes, true, true);
}

var collectSerializationDependencies = function (text, dependencies) {
    var serialization = JSON.parse(text);
    Object.keys(serialization).forEach(function (label) {
        var description = serialization[label];
        if (typeof description.module === "string") {
            dependencies.push(description.module);
        }
    });
    return dependencies;
};

