const EventEmitter = require('events'),
    SSH2 = require('ssh2'),
    read = require('read'),
    net = require('net'),
    fs = require('fs'),
    Q = require('q'),
    getPort = require("get-port"),
    socks = require('socksv5'),
    SSHConstants = require('./sshConstants');


var defaultOptions = {
    reconnect: true,
    port: 22,
    reconnectTries: 10,
    reconnectDelay: 5000
};

function endSocket(socket){
    if(socket && socket.writable){
        socket.end('\x03');
        socket.signal('INT');
        socket.signal('KILL');
    }
}

class SSHConnection extends EventEmitter {

    constructor(options) {
        super();
        this.config = Object.assign({}, defaultOptions, options);
        this.config.uniqueId = this.config.uniqueId || `${this.config.username}@${this.config.host}`;
        this.activeTunnels = {};
        this.__$connectPromise = null;
        this.__retries = 0;
        this.__err = null;
        this.__sftp = null;
    }

   /**
     * Emit message on this channel
     * @param {*} channel 
     * @param {*} status 
     * @param {*} ssh 
     * @param {*} payload 
     */
    emit(channel, status, payload) {
        super.emit(channel, status, this, payload);
        super.emit(`${channel}:${status}`, this, payload);
    }


    /**
     * Get shell socket
     */
    getShellSocket(options) {
        options = options || {};
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
        });
    }

    /**
     * Spawn a command
     */
    spawnCmd(cmd, params, options) {
        options = options || {};
        cmd += (Array.isArray(params) ? (" " + params.join(" ")) : "");
        return this.connect().then(() => {
            return Q.Promise((resolve, reject) => {
                this.sshConnection.exec(cmd, options, (err, stream) => {
                    if (err)
                        return reject(err);
                    stream.on('close', function () {
                        console.log(`Closed stream - ${cmd}`);
                    }).on('finish', function () {
                        console.log(`Closed stream - ${cmd}`);
                    });
                    stream.kill = function () {
                        endSocket(stream);
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
        cmd += (Array.isArray(params) ? (" " + params.join(" ")) : "");
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
        this.emit(SSHConstants.CHANNEL.SSH, SSHConstants.STATUS.BEFOREDISCONNECT);
        return this.closeTunnel().then(() => {
            if (this.sshConnection){
                this.sshConnection.end();
                this.emit(SSHConstants.CHANNEL.SSH, SSHConstants.STATUS.DISCONNECT);
            }
        });
    }

    /**
     * Connect the SSH Connection
     */
    connect(c) {
        this.config = Object.assign(this.config, c);
        ++this.__retries;

        if (this.__$connectPromise != null)
            return this.__$connectPromise;

        this.__$connectPromise = Q.promise((resolve, reject, notify) => {
            this.emit(SSHConstants.CHANNEL.SSH, SSHConstants.STATUS.BEFORECONNECT);
            if (!this.config || typeof this.config === 'function' || !this.config.host || !this.config.username) {
                reject("Invalid SSH connection configuration host/username can't be empty");
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
                        this.emit(SSHConstants.CHANNEL.SSH, SSHConstants.STATUS.DISCONNECT, { err: err });
                        this.__$connectPromise = null;
                        return reject(err);
                    }
                    this.emit(SSHConstants.CHANNEL.SSH, SSHConstants.STATUS.CONNECT);
                    this.__retries = 0;
                    this.__err = null;
                    this.__sftp = sftp;
                    resolve(this);
                });
            }).on('error', (err) => {
                this.emit(SSHConstants.CHANNEL.SSH, SSHConstants.STATUS.DISCONNECT, {err: err});
                this.__err = err;
                reject(err);
                this.__$connectPromise = null;
            }).on('close', (hadError) => {
                this.emit(SSHConstants.CHANNEL.SSH, SSHConstants.STATUS.DISCONNECT, {err: this.__err});
                reject(this.__err);
                this.__$connectPromise = null;
                if (this.__err != null && this.__err.level != "client-authentication" && this.__err.code != 'ENOTFOUND') {
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
                                        this.emit(SSHConstants.CHANNEL.TUNNEL, SSHConstants.STATUS.DISCONNECT, {tunnelConfig: tunnelConfig, err: err});
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
                                this.sshConnection.forwardOut('', 0, tunnelConfig.remoteAddr, tunnelConfig.remotePort, (err, stream) => {
                                    if (err) {
                                        this.emit(SSHConstants.CHANNEL.TUNNEL, SSHConstants.STATUS.DISCONNECT, {tunnelConfig: tunnelConfig, err: err});
                                        return err;
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
                        this.emit(SSHConstants.CHANNEL.TUNNEL, SSHConstants.STATUS.CONNECT, {tunnelConfig: tunnelConfig});
                        resolve(this.activeTunnels[tunnelConfig.name]);
                    }).on('error', (err) => {
                        this.emit(SSHConstants.CHANNEL.TUNNEL, SSHConstants.STATUS.DISCONNECT, {tunnelConfig: tunnelConfig, err: err});
                        server.close();
                        reject(err);
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
                this.emit(SSHConstants.CHANNEL.TUNNEL, SSHConstants.STATUS.BEFOREDISCONNECT, {tunnelConfig: tunnel});
                tunnel.server.close(() => {
                    this.emit(SSHConstants.CHANNEL.TUNNEL, SSHConstants.STATUS.DISCONNECT, {tunnelConfig: this.activeTunnels[name]});
                    delete this.activeTunnels[name];
                    resolve();
                });
            } else if (!name) {
                var tunnels = Object.keys(this.activeTunnels).map((key) => this.closeTunnel(key));
                resolve(Q.all(tunnels));
            }
        });
    }

    /**
     * End socket by ending pty session
     * @param {*} socket 
     */
    endSocket(socket){
        endSocket(socket);
    }
}

module.exports = SSHConnection;
