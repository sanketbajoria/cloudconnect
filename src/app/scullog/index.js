var scullog = require('scullog'),
    utils = require('../utils/utils.js'),
    Q = require('q'),
    getPort = require("get-port"),
    ShellFileManager = require("./shellFileManager");

module.exports = function(devTunnel){
    return Q.Promise((resolve, reject) => {
        getPort().then(function(port){
            scullog.init({
                directory: '/',
                port: port,
                fileManager: new ShellFileManager(devTunnel)
            }).then(function(){
                resolve(port);
            });
        })
    });
}