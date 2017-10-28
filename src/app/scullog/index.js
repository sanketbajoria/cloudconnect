var Scullog = require('scullog'),
    utils = require('../utils/utils.js'),
    Q = require('q'),
    getPort = require("get-port"),
    ShellFileManager = require("./shellFileManager"),
    RemoteDockerFileManager = require("./remoteDockerFileManager"),
    LocalDockerFileManager = require("./localDockerFileManager"),
    LocalTunnel = require("../tunnel/localTunnel");
    

module.exports = function(devTunnel, server, app){
    return Q.Promise((resolve, reject) => {
        getPort().then(function(port){
            var fileManager;
            utils.isLocalHost(server).then((isLocal) => {
                if(utils.isDockerType(app)){
                    if(isLocal){
                        fileManager = new LocalDockerFileManager(null, new LocalTunnel(), app);
                    }else{
                        var sshApp = server.applications.filter(function(a){
                            return utils.isTerminalType(a);
                        })[0];
                        fileManager = new RemoteDockerFileManager(null, devTunnel, app, sshApp);
                    }
                }else{
                    fileManager = new ShellFileManager(null, devTunnel, app);
                }
                var scullog = new Scullog({
                    directory: '/',
                    port: port,
                    fileManager: fileManager
                })
                fileManager.scullog = scullog;
                
                scullog.initialized().then(function(){
                    resolve(port);
                });
            })
            
        })
    });
}