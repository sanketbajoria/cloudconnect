const EventEmitter = require('events'),
    SSH2 = require('ssh2'),
    read = require('read'),
    net = require('net'),
    fs = require('fs'),
    Q = require('q'),
    C = require('cli-color'),
    clone = require('clone'),
    getPort = require("get-port"),
    socks = require('socksv5');


var defaultOptions = {
    reconnect: true,
    port: 22,
    reconnectTries: 10,
    reconnectDelay: 5000
};



class SSHTunnel extends EventEmitter {
    
    static get CHANNEL(){
        return {
            SSH: "ssh",
            TUNNEL: "tunnel"
        }
    }

    constructor(options) {
      super();
      this.config = Object.assign({}, defaultOptions, options);
      this.activeTunnels = {};
      this.__$connectPromise = null;
      this.__retries = 0;
      this.__err = null; 
    }

    /**
     * Get shell socket
     */
    getShellSocket(options) {
        return this.connect().then(() => {
            return Q.Promise((resolve, reject) => {
                this.sshConnection.shell(options, (err, stream) => {
                    if (err) throw err;
                    resolve(stream);
                });
            });
        })
    }

    /**
     * Get a Socks Port
     */
    getSocksPort() {
        return this.addTunnel({name:"__socksServer", socks: true}).then((tunnel) => {
            return tunnel.localPort;
        });
    }

    /**
     * Close SSH Connection
     */
    close() {
        return this.closeTunnel().then(() => {
            if(this.sshConnection)
                this.sshConnection.end();
        });
    }

    /**
     * Connect the SSH Connection
     */
    connect() {
        ++this.__retries;
        if (this.__$connectPromise != null)
            return this.__$connectPromise;

        this.__$connectPromise = Q.promise((resolve, reject) => {
            if (!this.config || typeof this.config === 'function' || !this.config.host || !this.config.username) {
                reject('You need to specify the ssh connection config');
                this.__$connectPromise = null;
                return;
            }

            if (this.config.tryKeyboard && !this.config.password && typeof this.config !== 'undefined') {
                delete this.config.password;
            }

            if (this.config.identity) {
                if (fs.existsSync(this.config.identity)) {
                    this.config.privateKey = fs.readFileSync(this.config.identity);
                }
                delete this.config.identity;
            }

            //Start ssh server connection
            this.sshConnection = new SSH2();
            this.sshConnection.on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
                prompts.forEach((prompt) => {
                    read({ prompt: prompt.prompt, silent: true }, (err, password) => {
                        finish([password]);
                    });
                });
            }).on('ready', (err) => {
                this.emit(SSHTunnel.CHANNEL.SSH, {connected: true}, this);
                this.__retries = 0;
                this.__err = null;
                resolve(this);
            }).on('error', (err) => {
                this.emit(SSHTunnel.CHANNEL.SSH, {connected: false, err: err}, this);
                this.__err = err;
            }).on('close', (hadError) => {
                this.emit(SSHTunnel.CHANNEL.SSH, {connected: false, err: this.__err}, this);
                reject();
                this.__$connectPromise = null;
                if(this.__err != null && this.__err.level != "client-authentication" && this.__err.code != 'ENOTFOUND'){
                    if (this.config.reconnect && this.__retries <= this.config.reconnectTries) {
                        setTimeout(() => {
                            this.connect();
                        }, this.config.reconnectDelay);
                    }
                }
            }).connect(this.config);
        });
        return this.__$connectPromise;
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
        if(this.getTunnel(tunnelConfig.name)){
            return Q.when(this.getTunnel(tunnelConfig.name))
        }else{
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
                    this.emit(SSHTunnel.CHANNEL.TUNNEL, {connected: false}, this.activeTunnels[name]);
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

module.exports = SSHTunnel;
