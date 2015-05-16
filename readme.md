# node-connection-paths

## Description
Determine if two things are connected (e.g. network nodes) and generate a list of possible paths. For example, if A connects to B and C, B connects to C and D, and C connects to D and A, then A can connect to D via an infinite number of paths, assuming a thing is allowed to reconnect to previous things in the path.

## API
#### Connections(```opt```)

Instantiate Connections

* object `opt` - An options object
  * string | array{array{string}} `source` - An array of arrays of two strings or URL or file system path to a CSV file that maps sources to destinations
  * boolean `hasHeader` - (Optional) Whether or not `source` has a header. If `true`, the first row will be removed. Defaults to `false`.

__Example__

```
var Connections = require('node-connection-paths'),
    connections = Connections(
        {
            hasHeader: true,
            source: [['A','B'], ['A','C'], ['B','C'], ['B','D'], ['C','D'], ['C','A']]
        }
    );
```

#### connections.getDestinations(```source```, ```cb```)

Get the destinations of a source

* string `opt` - A source
* function(null | object `err`, array `destinations`) `cb` - A function to be executed after the destinations are collected

__Example__

```
connections.getDestinations('A', function(err, destinations) {
    if (err){ throw err; }
    console.log(destinations); //[ 'B', 'C' ]
});
```

#### connections.getPaths(```opt```, ```cb```)

Generate possible paths between a source and destination

* object `opt` - An options object
  * string `source` - A source
  * string `destination` - A destination
  * boolean `reverse` - Whether or not a node is allowed to connect to the previous node. Defaults to `false`.
  * boolean `revisit` - Whether or not a node is allowed to connect to any previous nodes. Defaults to `false`.
  * string `format` - (Optional) If "string", `paths` will be an array of strings. If "array", `paths` will be an array of arrays of strings. Defaults to "array".
  * number `max` - (Optional) The maximum number of paths to generate. Defaults to 100.
  * object `depth`
     * number `queue` - (Optional) Concurrency limit for recursive operations. Defaults to 500.
     * number `recursion` - (Optional) Maximum path recursion. Defaults to 5.
* function(null | object `err`, array{string} | array{array{string}} `paths`) `cb` - A function to be executed after the paths are generated

__Example__

```
connections.getPaths(
    {
        source: 'A',
        destination: 'D',
        reverse: true,
        revisit: true,
        format: 'string',
        max: 2,
        depth: {
            queue: 10,
            recursion: 3
        }
    }, function(err, paths) {
        if (err) { throw err; }
        console.log(paths); //[ 'A,B,D', 'A,C,D' ]
    }
);
```

#### connections.areConnected(```opt```, ```cb```)

Determine if a source and destination are connected. Note that it is much faster to use a [directed graph](http://en.wikipedia.org/wiki/Directed_graph). There are several directed graph libraries available on NPM, including [graph.js](https://www.npmjs.com/package/graph.js) and [directed-graph](https://www.npmjs.com/package/directed-graph).

* object `opt` - An options object
  * string `source` - A source
  * string `destination` - A destination
  * object `depth`
     * number `queue` - (Optional) Concurrency limit for recursive operations. Defaults to 100.
     * number `recursion` - (Optional) Maximum path recursion. Defaults to 5.
* function(null | object `err`, boolean `areConnected`) `cb` - A function to be executed after the check is completed

__Example__

```
connections.areConnected(
    {
        source: 'A',
        destination: 'D',
        depth: {
            queue: 100,
            recursion: 10
        }
    }, function(err, areConnected) {
        if (err) { throw err; }
        console.log(areConnected); //true
    }
);
```

## Events
#### connections.events.on('ready', function(null | object `err`))

If the connection source / destination CSV data is loaded via URL or file system path, the API methods cannot be called until this event is emitted

__Example__

```
var path = require('path'),
    connections = Connections({source: path.join(__dirname, 'test.csv')});

connections.events.on('ready', function(err) {
    if (err) { throw err; }

    connections.areConnected(
        {
            source: 'A',
            destination: 'D',
            depth: {
                queue: 100,
                recursion: 10
            }
        }, function(err, areConnected) {
            if (err) { throw err; }
            console.log(areConnected); //true
        }
    );
});
```

## Installation
#### Npm
```
npm install node-connection-paths --save
```