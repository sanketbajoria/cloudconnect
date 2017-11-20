var couchdb = require('galaxy-fauxton'),
    utils = require('../utils/utils.js'),
    Q = require('q'),
    getPort = require("get-port");

var connections = {};

module.exports = {
    add: function(s, app){
        var url = utils.createUrl(s, app);
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
    get: function(s, app){
        return connections[utils.createUrl(s, app)];
    },
    addIfNotExist: function (s, app) {
        if (this.get(s, app)) {
            return Q.when(this.get(s, app));
        } else {
            return this.add(s, app);
        }
    }
}