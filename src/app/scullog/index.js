var scullog = require('scullog'),
    utils = require('../utils/utils.js'),
    Q = require('q'),
    getPort = require("get-port"),
    ShellFileManager = require("./shellFileManager"),
    RemoteDockerFileManager = require("./remoteDockerFileManager");
    

module.exports = function(devTunnel, app){
    return Q.Promise((resolve, reject) => {
        getPort().then(function(port){
            scullog.init({
                directory: '/',
                port: port,
                fileManager: utils.isDockerType(app)? new RemoteDockerFileManager(devTunnel): new ShellFileManager(devTunnel, app) 
            }).then(function(){
                resolve(port);
            });
        })
    });
}