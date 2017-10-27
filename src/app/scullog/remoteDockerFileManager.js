var ShellFileManager = require('./shellFileManager');
cp  = require('child_process');
var Q = require('q');
var dcp = require('duplex-child-process');
var stream = require('stream');

class RemoteDockerFileManager extends ShellFileManager{

    constructor(tunnel , app) {
        super(tunnel);
        this.tunnel = tunnel;
        this.app=app;
        
      }

    __getPath(){
      if(this.__path==null){
        this.__path = this.__getShellPath();        
      }
      return this.__path;
    }
      
    __normalizeParams(params){
        params = [...params];
        return this.__getPath().then((path) =>{
          params[0] = `PATH=${path}; docker exec ${this.app.config.dockerName} /bin/sh -c '${params[0]}'`
          return params;
        });
      }

      __getShellPath() {
        return this.tunnel.getShellSocket().then((stream) => {
          return new Q.Promise((resolve, reject) => {
            var buffer = "";
            stream.on('data', function (data ) {
                console.log('STDOUT: ' + data);
                buffer+=data;
                var inputSize=0;
                var dataLength = data.length
                var pathCommand=true;
                if (dataLength > (2+inputSize) && (data.indexOf("$") >= dataLength - 2 || data.indexOf("#") >= dataLength - 2)) {
                    if (buffer.indexOf("PATH=") > 0  && buffer.lastIndexOf("ENDPATH") >0) {
                        var path = buffer.substring(buffer.lastIndexOf("=")+1, buffer.lastIndexOf("ENDPATH"));
                        if(stream.writable){
                            stream.end('\x03');
                            stream.signal('INT');
                            stream.signal('KILL');
                            stream.close();
                        }
                        buffer = "";                        
                        resolve(path);
                    }
                    else if(pathCommand){
                        buffer = "";
                        pathCommand=false;
                        var cmd="echo PATH=$PATH ENDPATH \r\n ";
                        stream.write(cmd);
                        inputSize=cmd.length
                    }
                }
                
            }).stderr.on('data', function (data) {
                console.log('STDERR: ' + data);
            });
          })
        });
    }
}    
module.exports = RemoteDockerFileManager