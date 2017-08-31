var couchdb = require('galaxyfauxton'),
    utils = require('../utils/utils.js'),
    Q = require('q'),
    getPort = require("get-port");

var connections = {};

module.exports = {
    add: function(s){
        var url = utils.createUrl(s);
        return getPort().then(localPort => {
            var config = {port: localPort, couchdb: url};
            config.server = new couchdb(config);
            return connections[url] = config;
        });
    },
    remove: function(s){
        var url = utils.createUrl(s);
        if(connections[url]){
            connections[url].server.close();
            delete connections[url];
        }
    },
    get: function(s){
        return connections[utils.createUrl(s)];
    },
    addIfNotExist: function (s) {
        if (this.get(s)) {
            return Q.when(this.get(s));
        } else {
            return this.add(s);
        }
    }
}