var fs = require('fs'),
    EventEmitter = require('events').EventEmitter,
    async = require('async'),
    csv = require('csv'),
    request = require('request'),
    validator = require('validator'),
    _ = require('lodash');

var addMapItem = function(source, destination) {
        connections.map[source] = _.isArray(connections.map[source]) ?
            connections.map[source] : [];

        if (!_.contains(connections.map[source], destination)) {
            connections.map[source].push(destination);
        }
    },
    buildMap = function(opt, data) {
        var err = null;

        if (_.isArray(data)) {
            connections.map = {};

            if (opt.hasHeader === true) {
                data.shift();
            }

            _.each(data, function(row, i) {
                if (err) {
                    return false;
                }

                if (_.isArray(row)) {
                    if (row.length === 2) {
                        var source = row[0],
                            destination = row[1];

                        if (!_.isString(source)) {
                            err = 'data[' + i + '][0] (connection source) is not a string';
                        }
                        else if (!_.isString(destination)) {
                            err = 'data[' + i + '][1] (connection destination) is not a string';
                        }
                        else {
                            addMapItem(source, destination);
                            addMapItem(destination, source);
                        }
                    }
                    else {
                        err = 'data[' + i + '] (connection source / destination array) must have a length of 2';
                    }
                }
                else {
                    err = 'data[' + i + '] (connection source / destination array) is not an array';
                }
            });
        }
        else {
            err = 'data (connection source / destination array of arrays) is not an array';
        }

        connections.events.emit('ready', err ? new Error(err) : err);
    },
    connections = {
        events: new EventEmitter(),
        areConnected: function(opt, cb) {
            if (!_.isFunction(cb)) {
                throw new TypeError('cb must be a function');
            }

            if (!_.isObject(opt)) {
                opt = {};
            }

            opt.max = 1;
            opt.reverse = false;
            opt.revisit = false;

            connections.getPaths(opt, function(err, paths) {
                cb(err, paths.length > 0);
            });
        },
        getDestinations: function(source, cb) {
            if (!_.isFunction(cb)) {
                throw new TypeError('cb must be a function');
            }

            if (_.isString(source)) {
                var destinations = connections.map[source];

                if (_.isArray(destinations)) {
                    cb(null, destinations);
                }
                else {
                    cb(new TypeError('source destinations were not an array'));
                }
            }
            else {
                cb(new TypeError('source must be a string'));
            }
        },
        getPaths: function(opt, cb) {
            if (!_.isFunction(cb)) {
                throw new TypeError('cb must be a function');
            }

            if (!_.isObject(opt)) {
                cb(new TypeError('opt must be an object'));
            }
            else if (!_.isString(opt.source)) {
                cb(new TypeError('opt.source must be a string'));
            }
            else if (!_.isString(opt.destination)) {
                cb(new TypeError('opt.destination must be a string'));
            }
            else {
                if (!_.isBoolean(opt.reverse)) {
                    opt.reverse = false;
                }
                if (!_.isBoolean(opt.revisit)) {
                    opt.revisit = false;
                }
                if (opt.format !== 'string' && opt.format !== 'array') {
                    opt.format = 'array';
                }
                if (!_.isNumber(opt.max)) {
                    opt.max = 100;
                }
                if (!_.isObject(opt.depth)) {
                    opt.depth = {};
                }
                if (!_.isNumber(opt.depth.queue)) {
                    opt.depth.queue = 500;
                }
                if (!_.isNumber(opt.depth.recursion)) {
                    opt.depth.recursion = 5;
                }

                var paths = [],
                    finished = false,
                    queue = async.queue(function(task, done) {
                        if (!finished) {
                            if (paths.length === opt.max ||
                                (task.path.length > opt.depth.recursion) ||
                                (task.path.length === opt.depth.recursion && !paths.length)) {

                                cb(null, paths);
                                queue.kill();
                                finished = true;
                            }
                            else {
                                connections.getDestinations(task.path[task.path.length - 1], function(err, destinations) {
                                    if (err) { handleQueueError(err); }
                                    else {
                                        _.each(destinations, function(destination) {
                                            if (!(!opt.revisit && _.contains(task.path, destination)) &&
                                                !(!opt.reverse && task.path[task.path.length - 2] === destination)){

                                                var path = _.clone(task.path);

                                                path.push(destination);

                                                if (destination === opt.destination) {
                                                    paths.push(opt.format === 'array' ? path : path.toString());
                                                }
                                                else {
                                                    queue.push({path: path}, handleQueueError);
                                                }
                                            }
                                        });

                                        _.defer(done);
                                    }
                                });
                            }
                        }
                    }, opt.depth.queue),
                    handleQueueError = function(err) {
                        if (err) {
                            cb(err, paths);
                            queue.kill();
                        }
                    };

                queue.drain = function() {
                    cb(null, paths);
                };

                queue.push({path: [opt.source]}, handleQueueError);
            }
        }
    };

module.exports = function(opt) {
    if (_.isArray(opt.source)) {
        buildMap(opt, opt.source);
    }
    else if (_.isString(opt.source)) {
        if (validator.isURL(opt.source)) {
            request(opt.source, function(err, res, data) {
                if (err) { throw err; }
                else { buildMap(opt, data); }
            });
        }
        else {
            fs.readFile(opt.source, function(err, data) {
                if (err) { throw err; }
                else {
                    csv.parse(data, function(err, data) {
                        if (err) { throw err; }
                        else { buildMap(opt, data); }
                    });
                }
            });
        }
    }
    else {
        throw new TypeError('opt.source must be a string or an array');
    }

    return connections;
};