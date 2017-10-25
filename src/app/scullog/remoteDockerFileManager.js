var ShellFileManager = require('./shellFileManager');
cp  = require('child_process');
var Q = require('q');
var dcp = require('duplex-child-process');
var stream = require('stream');

class RemoteDockerFileManager extends ShellFileManager{

    constructor(tunnel) {
        super(tunnel);
        this.tunnel = tunnel;
        
      }

    __getPath(){
      if(this.__path==null){
        this.__path = this.tunnel.getShellPath();        
      }
      return this.__path;
    }
      
    __normalizeParams(params){
        params = [...params];
        this.__getPath().then((path) =>{
          return params[0] = `PATH=${path}; docker exec qbo-web /bin/sh -c '${params[0]}'`
        });
      }
}    
module.exports = RemoteDockerFileManager