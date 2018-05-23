const configPath = __dirname + "/../config.json";
var fs = require('fs');
var checkLocalHost = require('check-localhost');
var config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
var net = require('net');
module.exports = {
    createUrl: function (s, app) {
        var relPath = app.config.relativePath ? `/${this.stripForwardSlash(app.config.relativePath)}` : '';
        if (this.getPort(s, app)) {
            return `${this.getProtocol(s, app)}://${this.getHost(s, app)}:${this.getPort(s, app)}${relPath}`;
        } else {
            return `${this.getProtocol(s, app)}://${this.getHost(s, app)}${relPath}`;
        }
    },
    stripForwardSlash: function (p) {
        if (p[0] == '/') {
            return p.substring(1);
        }
        return p;
    },
    getPort: function (s, app) {
        if (s._tunnel && this.isForwardConnection(s))
            return s._tunnel.localPort;
        return app.port;
    },
    getHost: function (s, app) {
        if (this.isTerminalType(app)) {
            return __dirname + "/../term/index.html";
        } else {
            return (s._tunnel && this.isForwardConnection(s)) ? "localhost" : this.getRemoteAddr(s);
        }
    },
    getRemoteAddr: function (s) {
        if (this.isGenericType(s)) {
            return s.generic.host;
        } else {
            return s.cloud.instance.getAddress();
        }
    },
    getProtocol: function (s, app) {
        if (this.isTerminalType(app)) {
            return "file";
        }
        return app.protocol || "http";
    },
    getInstanceName: function (i) {
        if (this.isGenericType(i)) {
            return i.generic.name;
        } else {
            return i.cloud.instanceName;
        }
    },
    getInstanceId: function (i) {
        if (this.isGenericType(i)) {
            return i.generic.name;
        } else {
            return i.cloud.instance.getUniqueId();
        }
    },
    createCouchUrl: function (s, app) {
        return `http://localhost:${s._couch.port}`;
    },
    createScullogUrl: function (s) {
        return `http://localhost:${s._scullog.port}`;
    },
    createProxyUrl: function (port) {
        return `socks5://localhost:${port}`;
    },
    isCouchDBType: function (app) {
        return app.type === "couchdb"
    },
    isTerminalType: function (app) {
        return app.type === "ssh"
    },
    isScullogType: function (app) {
        return app.type === "scullog"
    },
    isCustomType: function (app) {
        return app.type === "custom"
    },
    isForwardConnection: function (s) {
        return s.connection && s.connection.type === "forward";
    },
    isSocksConnection: function (s, app) {
        return !this.isTerminalType(app) && !this.isScullogType(app) && s.connection && s.connection.type === "socks";
    },
    isDirectConnection: function (s) {
        return s.connection && s.connection.type === "direct";
    },
    isDockerType: function (app) {
        return app.type === "Docker"
    },
    isLocalHost: function (s) {
        return checkLocalHost(this.getRemoteAddr(s));
    },
    getType: function (c) {
        return ((c && c.type) ? c.type : c);
    },
    getCloudProfileConfiguration: function (i) {
        var types = this.getConfiguration().profile.types;
        if (i) {
            return types[this.getType(i)];
        }
        return types;
    },
    isGenericType: function (c) {
        return this.getType(c) === 'generic';
    },
    toHumanSize: function (size) {
        var hz;
        if (size < 1024) hz = size + ' B';
        else if (size < 1024 * 1024) hz = (size / 1024).toFixed(2) + ' KB';
        else if (size < 1024 * 1024 * 1024) hz = (size / 1024 / 1024).toFixed(2) + ' MB';
        else hz = (size / 1024 / 1024 / 1024).toFixed(2) + ' GB';
        return hz;
    },
    isString: function (s) {
        return typeof s === 'string';
    },
    safeApply: function ($scope, fn) {
        var phase = $scope.$root.$$phase;
        if (phase == '$apply' || phase == '$digest') {
            if (fn && (typeof (fn) === 'function')) {
                fn();
            }
        } else {
            $scope.$apply(fn);
        }
    },
    saveDB: function (db, context) {
        return function(cb){
            cb = cb.bind(context);
            return function () {
                var ret = cb(...arguments);
                db.save();
                return ret;
            }    
        }
    },
    getConfiguration: function () {
        return config;
    },
    getSSH: function(s, app, db){
        var i = s;
        var instances = (this.isTerminalType(app) || this.isScullogType(app))?[s]:[];   
        while(i = i.connection.ref){
            i = db.getMainRepository().getInstance(i);
            if(!this.isGenericType(i)){
                i.cloud.instance = cloud.getCloudInstancesBasedOnInstanceId(db.getMainRepository().getProfile(i.cloud.profileId), i.cloud.instanceName)[0];
            }
            instances.push(i);
        }
        if(instances.length > 0){
            var sshConfigs = instances.reverse().map((instance) => {
                var sshApp = instance.applications.filter((a) => {
                    return this.isTerminalType(a);
                })[0];
                var sshConfig = { username: sshApp.config.userName, host: this.getRemoteAddr(instance), port: sshApp.port };
                if (sshApp.config.secret.key == 'password') {
                    sshConfig.password = sshApp.config.secret.password
                } else {
                    sshConfig.identity = sshApp.config.secret.pem.file.path;
                    sshConfig.passphrase = sshApp.config.secret.pem.passphrase;
                    sshConfig.privateKey = sshApp.config.secret.pem.file.content;
                }
                sshConfig.uniqueId = db.getUniqueId(instance);
                sshConfig.name = this.getInstanceName(instance)
                return sshConfig;
            })
            return new SSHTunnel(sshConfigs);
        }
        return Q.when();
    },
    isPortReachable: (port, opts) => {
        opts = Object.assign({timeout: 2000}, opts);
    
        return new Promise((resolve => {
            const socket = new net.Socket();
    
            const onError = () => {
                socket.destroy();
                resolve(false);
            };
    
            socket.setTimeout(opts.timeout);
            socket.on('error', onError);
            socket.on('timeout', onError);
    
            socket.connect(port, opts.host, () => {
                socket.end();
                resolve(true);
            });
        }));
    }
}