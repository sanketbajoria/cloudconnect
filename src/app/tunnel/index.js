const EventEmitter = require('events'),
    SSHConnection = require('./sshConnection'),
    SSHConstants = require('./sshConstants');

function peek(arr) {
    return arr[arr.length - 1]
}

function on(sshConnection, event, callback) {
    sshConnection.on(event, callback);
    return {
        sshConnection: sshConnection,
        close: function () {
            return sshConnection.removeListener(event, callback);
        }
    }
}

class SSHTunnel extends EventEmitter {

    constructor(options, cacheConnection) {
        super();
        options = Array.isArray(options) ? options : [options];
        this.config = options.map(o => {
            o.uniqueId = o.uniqueId || `${o.username}@${o.host}`;
            return o;
        });
        this.deregisterListeners = [];
        this.cacheConnection = cacheConnection;
    }

    /**
     * Get SSH if existing from cache otherwise create new one
     * @param {*} sshConfig 
     */
    getSSHConnection(sshConfig) {
        var ret;
        if (!this.cacheConnection) {
            ret = new SSHConnection(sshConfig);
        } else {
            if (sshConfig && !SSHTunnel.__cache[sshConfig.uniqueId]) {
                ret = SSHTunnel.__cache[sshConfig.uniqueId] = new SSHConnection(sshConfig);
            }
            ret = SSHTunnel.__cache[sshConfig.uniqueId];
        }
        this.deregisterListeners.push(on(ret, SSHConstants.CHANNEL.SSH, (function(){
            this.emit.apply(this, arguments);
        }).bind(this, SSHConstants.CHANNEL.SSH)));
        this.deregisterListeners.push(on(ret, SSHConstants.CHANNEL.TUNNEL, (function(){
            this.emit.apply(this, arguments);
        }).bind(this, SSHConstants.CHANNEL.TUNNEL)));
        return ret.connect().then((ssh) => {
            ssh.emit(SSHConstants.CHANNEL.SSH, SSHConstants.STATUS.CONNECT);
            return ssh;
        });
    }

    /**
     * Connect SSH connection, via single or multiple hopping connection
     * @param {*} Single/Array of sshConfigs 
     */
    connect() {
        var lastSSH;
        for (var i = 0; i < this.config.length; i++) {
            ((sshConfig) => {
                if (!lastSSH) {
                    lastSSH = this.getSSHConnection(sshConfig);
                } else {
                    lastSSH = lastSSH.then((ssh) => {
                        return ssh.spawnCmd(`nc ${sshConfig.host} ${sshConfig.port}`);
                    }).then((stream) => {
                        sshConfig.sock = stream;
                        return this.getSSHConnection(sshConfig);
                    });
                }
            })(this.config[i]);
        }
        return lastSSH;
    }

    /**
     * Close SSH Connection
     */
    close() {
        var sshConnections = this.deregisterListeners.map(f => f.sshConnection);
        sshConnections.forEach((sshConnection) => {
            sshConnection.close().then(() => {
                this.deregisterListeners.forEach(f => f.close());
            });
        }) 
    }

}

/**
 * For caching SSH Connection
 */
SSHTunnel.__cache = {};

module.exports = SSHTunnel;
