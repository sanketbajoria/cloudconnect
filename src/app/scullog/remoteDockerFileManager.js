var ShellFileManager = require('./shellFileManager'),
    Q = require('q'),
    stream = require('stream');

class RemoteDockerFileManager extends ShellFileManager {

    constructor(scullog, tunnel, dockerApp, sshApp) {
        super(scullog, tunnel, sshApp);
        this.dockerApp = dockerApp;
    }

    /**
     * Overridden to support docker
     * @param {*} params 
     */
    __normalizeParams(params) {
        params = [...params];
        return this.__getPath().then((path) => {
            if(this.app.config.sudo){
                if(this.app.config.secret.password){  
                  params[0] = `PATH=${path}; echo "${this.app.config.secret.password}" | sudo -S echo "\n";docker exec ${this.dockerApp.config.dockerName} /bin/sh -c '${params[0]}' | awk '{if(NR>1)print}'`;
                }else{
                  params[0] = `PATH=${path}; sudo docker exec ${this.dockerApp.config.dockerName} /bin/sh -c '${params[0]}'`;
                }
                params[2] = this.app.config.sudo; //sudo su can prompt for password which require pty;
            }else{
                params[0] = `PATH=${path}; docker exec ${this.dockerApp.config.dockerName} /bin/sh -c '${params[0]}'`  
            }
            //params[0] = `PATH=${path}; docker exec ${this.dockerApp.config.dockerName} /bin/sh -c "echo $(${params[0]})"`
            //params[0] = `PATH=${path}; sudo docker exec ${this.dockerApp.config.dockerName} /bin/sh -c '${params[0]}'`
            //return super.__normalizeParams(params);
            return params;
        });
    }

    __getPath() {
        if (this.__path == null) {
            this.__path = this.__getShellPath();
        }
        return this.__path;
    }

    __getShellPath() {
        return this.tunnel.getShellSocket().then((stream) => {
            return new Q.Promise((resolve, reject) => {
                var buffer = "";
                stream.on('data', function (data) {
                    console.log('STDOUT: ' + data);
                    buffer += data;
                    var inputSize = 0;
                    var dataLength = buffer.trim().length
                    var pathCommand = true;
                    if (dataLength > (2 + inputSize) && (buffer.trim()[dataLength-1] ==  "$"|| buffer.trim()[dataLength-1] ==  "#")) {
                        if (buffer.indexOf("PATH=") > 0 && buffer.lastIndexOf("ENDPATH") > 0) {
                            var path = buffer.substring(buffer.lastIndexOf("=") + 1, buffer.lastIndexOf("ENDPATH"));
                            if (stream.writable) {
                                stream.end('\x03');
                                stream.signal('INT');
                                stream.signal('KILL');
                                stream.close();
                                stream.removeAllListeners();
                            }
                            buffer = "";
                            resolve(path);
                        }
                        else if (pathCommand) {
                            buffer = "";
                            pathCommand = false;
                            var cmd = "echo PATH=$PATH ENDPATH \r\n ";
                            stream.write(cmd);
                            inputSize = cmd.length
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