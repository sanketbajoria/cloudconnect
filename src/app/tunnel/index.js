const EventEmitter = require('events'),
    SSH2 = require('ssh2'),
    read = require('read'),
    net = require('net'),
    fs = require('fs'),
    Q = require('q'),
    clone = require('clone'),
    getPort = require("get-port"),
    socks = require('socksv5');


var defaultOptions = {
    reconnect: true,
    port: 22,
    reconnectTries: 10,
    reconnectDelay: 5000
};

function peek(arr){
    return arr[arr.length - 1]
}

class SSHTunnel extends EventEmitter {

    static get CHANNEL() {
        return {
            SSH: "ssh",
            TUNNEL: "tunnel"
        }
    }

    constructor(options) {
        super();
        options = Array.isArray(options)?options:[options];
        this.config = options.map(o => {
            o.uniqueId = o.uniqueId || `${o.username}@${o.host}`;
            return Object.assign({}, defaultOptions, o); 
        }); 
        this.activeTunnels = {};
        this.__$connectPromise = null;
        this.__retries = 0;
        this.__err = null;
        this.__sftp = null;
    }

    emit(){
        super.emit(...arguments);
        //console.log(arguments);
    }

    /**
     * Get SSH if existing from cache otherwise create new one
     * @param {*} sshConfig 
     * @param {*} create
     */
    static getSSH(sshConfigs, create) {
        var sshConfig = peek(sshConfigs);
        if (!SSHTunnel.__cache[sshConfig.uniqueId] && sshConfig && create) {
            SSHTunnel.__cache[sshConfig.uniqueId] = { $connection: new SSHTunnel(sshConfigs).__connect(sshConfig), config: sshConfigs };
        }
        return SSHTunnel.__cache[sshConfig.uniqueId] && SSHTunnel.__cache[sshConfig.uniqueId].$connection;
    }

    /**
     * Connect SSH connection, via single or multiple hopping connection
     * @param {*} Single/Array of sshConfigs 
     */
    connect(){
        var cacheSSH = SSHTunnel.getSSH(this.config);
        if(cacheSSH){
            return cacheSSH;
        }else{
            var lastSSH, sshConfig;
            for(var i=0;i<this.config.length;i++){
                (function(sshConfigs, idx){
                    var sshConfig = peek(sshConfigs);
                    if(!lastSSH){
                        lastSSH = SSHTunnel.getSSH(sshConfigs.slice(0, idx+1), true);
                    }else {
                        lastSSH = lastSSH.then((ssh) => {
                            return ssh.spawnCmd(`nc ${sshConfig.host} ${sshConfig.port}`);
                        }).then((stream) => {
                            sshConfig.sock = stream;
                            return SSHTunnel.getSSH(sshConfigs.slice(0, idx+1), true);
                        });
                    }
                })(this.config, i);
            }
            return lastSSH;
        }
    }

    /**
     * Get shell socket
     */
    getShellSocket(options) {
        options =  options || {};
        return this.connect().then(() => {
            return Q.Promise((resolve, reject) => {
                this.sshConnection.shell(options, (err, stream) => {
                    if (err)
                        return reject(err);
                    resolve(stream);
                });
            });
        })
    }

    /**
     * Get a sftp session
     */
    sftp() {
        return this.connect().then(() => {
            return this.__sftp;
            /* return Q.Promise((resolve, reject) => {
                this.sshConnection.sftp((err, sftp) => {
                    if (err)
                        return reject(err);
                    resolve(sftp);
                })
            }) */
        });
    }

    /**
     * Spawn a command
     */
    spawnCmd(cmd, params, options) {
        options = options || {};
        cmd += (Array.isArray(params)?(" " + params.join(" ")):"");
        return this.connect().then(() => {
            return Q.Promise((resolve, reject) => {
                this.sshConnection.exec(cmd, options, (err, stream) => {
                    if (err)
                        return reject(err);
                    stream.on('close', function(){
                        console.log(`Closed stream - ${cmd}`);
                    })
                    stream.on('finish', function(){
                        console.log(`Closed stream - ${cmd}`);
                    });
                    stream.kill = function(){
                        stream.end('\x03');
                        stream.signal('INT');
                        stream.signal('KILL');
                    }
                    resolve(stream);
                })
            })
        })
    }

    /**
     * Exec a command
     */
    execCmd(cmd, params, options) {
        options = options || {};
        cmd += (Array.isArray(params)?(" " + params.join(" ")):"");
        return this.connect().then(() => {
            return Q.Promise((resolve, reject) => {
                this.sshConnection.exec(cmd, options, (err, stream) => {
                    if (err)
                        return reject(err);
                    var buffer = "";
                    stream.on('close', function () {
                        resolve(buffer);
                    }).on('data', function (data) {
                        buffer += data;
                    }).stderr.on('data', function (data) {
                        reject(data);
                    });
                })
            })
        })
    }

    /**
     * Get a Socks Port
     */
    getSocksPort() {
        return this.addTunnel({ name: "__socksServer", socks: true }).then((tunnel) => {
            return tunnel.localPort;
        });
    }

    /**
     * Close SSH Connection
     */
    close() {
        return this.closeTunnel().then(() => {
            if (this.sshConnection)
                this.sshConnection.end();
        });
    }

    /**
     * On Disconnect of ssh connection, clear all the connection from cache which are dependent on this connection
     */
    onDisconnect(err){
        this.__err = err;
        this.emit(SSHTunnel.CHANNEL.SSH, { connected: false, err: this.__err }, this);
        //Remove from cache and subsequent connections
        Object.keys(SSHTunnel.__cache).forEach((k) => {
            if(SSHTunnel.__cache[k].config.filter((s) => s.uniqueId === peek(this.config).uniqueId).length > 0){
                delete SSHTunnel.__cache[k];
            }
        });
    }

    /**
     * Connect the SSH Connection using config
     */
    __connect(config) {
        return Q.promise((resolve, reject, notify) => {
            if (!config || typeof config === 'function' || !config.host || !config.username) {
                reject("Invalid SSH connection configuration host/username can't be empty");
                this.onDisconnect(new Error("Invalid SSH connection configuration host/username can't be empty"));
                return;
            }

            if (config.tryKeyboard && !config.password && typeof config !== 'undefined') {
                delete config.password;
            }

            if (config.identity) {
                if (fs.existsSync(config.identity)) {
                    config.privateKey = fs.readFileSync(config.identity);
                }
                delete config.identity;
            }

            // this.config.debug = function(arg){
            //     console.log(arg);
            // } 

            //Start ssh server connection
            this.sshConnection = new SSH2();
            this.sshConnection.on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
                prompts.forEach((prompt) => {
                    read({ prompt: prompt.prompt, silent: true }, (err, password) => {
                        finish([password]);
                    });
                });
            }).on('ready', (err) => {
                this.sshConnection.sftp((err, sftp) => {
                    if (err) {
                        this.onDisconnect(err);
                        return reject(err);
                    };
                    this.emit(SSHTunnel.CHANNEL.SSH, { connected: true }, this);
                    this.__retries = 0;
                    this.__err = null;
                    this.__sftp = sftp;
                    resolve(this);
                });
            }).on('error', (err) => {
                reject(err);
                this.onDisconnect(err);
            }).on('close', (hadError) => {
                reject(this.__err);
                this.onDisconnect(this.__err);
                if (this.__err != null && this.__err.level != "client-authentication" && this.__err.code != 'ENOTFOUND') {
                    if (this.config.reconnect && this.__retries <= this.config.reconnectTries) {
                        setTimeout(() => {
                            this.connect();
                        }, this.config.reconnectDelay);
                    }
                }
            }).connect(config);
        });
    }

    /**
     * Get existing tunnel by name
     */
    getTunnel(name) {
        return this.activeTunnels[name];
    }

    /**
     * Add new tunnel if not exist
     */
    addTunnel(tunnelConfig) {
        if (this.getTunnel(tunnelConfig.name)) {
            return Q.when(this.getTunnel(tunnelConfig.name))
        } else {
            return Q.Promise((resolve, reject) => {
                var server;
                if (tunnelConfig.socks) {
                    server = socks.createServer((info, accept, deny) => {
                        this.connect().then(() => {
                            this.sshConnection.forwardOut(info.srcAddr,
                                info.srcPort,
                                info.dstAddr,
                                info.dstPort,
                                (err, stream) => {
                                    if (err) {
                                        return deny();
                                    }
                                    var clientSocket;
                                    if (clientSocket = accept(true)) {
                                        stream.pipe(clientSocket).pipe(stream).on('close', () => {
                                            stream.end();
                                        });
                                    } else if (stream) {
                                        stream.end();
                                    }
                                });
                        });
                    }).useAuth(socks.auth.None());
                } else {
                    server = net.createServer()
                        .on('connection', (socket) => {
                            this.connect().then(() => {
                                this.sshConnection.forwardOut('', 0, tunnelConfig.remoteAddr, tunnelConfig.remotePort, (error, stream) => {
                                    if (error) {
                                        return;
                                    }
                                    stream.pipe(socket).pipe(stream).on('close', () => {
                                        stream.end();
                                    });
                                });
                            });
                        });
                }

                Q.when(tunnelConfig.localPort || getPort()).then((port) => {
                    tunnelConfig.localPort = port;
                    server.on('listening', () => {
                        this.activeTunnels[tunnelConfig.name] = Object.assign({}, { server: server }, tunnelConfig);
                        this.emit(SSHTunnel.CHANNEL.TUNNEL, { connected: true }, tunnelConfig);
                        resolve(this.activeTunnels[tunnelConfig.name]);
                    }).on('error', (err) => {
                        this.emit(SSHTunnel.CHANNEL.TUNNEL, { connected: false, err: err }, tunnelConfig);
                        server.close();
                        reject();
                        delete this.activeTunnels[name];
                    }).listen(tunnelConfig.localPort);
                });
            });
        }
    }

    /**
     * Close the tunnel
     */
    closeTunnel(name) {
        return Q.Promise((resolve, reject) => {
            if (name && this.activeTunnels[name]) {
                var tunnel = this.activeTunnels[name];
                tunnel.server.close(() => {
                    this.emit(SSHTunnel.CHANNEL.TUNNEL, { connected: false }, this.activeTunnels[name]);
                    delete this.activeTunnels[name];
                    resolve();
                });
            } else if (!name) {
                var tunnels = Object.keys(this.activeTunnels).map((key) => this.closeTunnel(key));
                resolve(Q.all(tunnels));
            }
        });
    }
}

/**
 * For caching SSH Connection
 */
SSHTunnel.__cache = {};

module.exports = SSHTunnel;
