const EventEmitter = require('events'),
    SSHConnection = require('./sshConnection'),
    SSHConstants = require('./sshConstants');

function peek(arr) {
    return arr[arr.length - 1]
}

function register(sshConnection, sshTunnel) {
    var events = [SSHConstants.CHANNEL.SSH, SSHConstants.CHANNEL.TUNNEL];
    sshConnection.__sshTunnels = sshConnection.__sshTunnels || [];
    sshConnection.__sshTunnels.push(sshTunnel);
    var cbs = events.map((event) => {
        var cb = (function () {
            this.emit.apply(this, arguments);
        }).bind(sshTunnel, event);
        sshConnection.on(event, cb);
        return cb;    
    });
    return {
        sshConnection: sshConnection,
        events: events,
        close: function () {
            var idx = sshConnection.__sshTunnels(sshTunnel);
            sshConnection.__sshTunnels.splice(idx, 1);
            if(sshConnection.__sshTunnels.length>0){
                events.forEach((event, idx) => {
                    sshConnection.removeListener(event, cbs[idx]);
                });
            }else{
                sshConnection.close().then(() => {
                    events.forEach((event, idx) => {
                        sshConnection.removeListener(event, cbs[idx]);
                    });
                });    
            }
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
        this.deregister = [];
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
        this.deregister.push(register(ret, this));
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
        this.deregister.forEach(f => f.close());
    }

}

/**
 * For caching SSH Connection
 */
SSHTunnel.__cache = {};

module.exports = SSHTunnel;
