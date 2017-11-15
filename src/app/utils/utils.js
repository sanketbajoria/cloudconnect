var checkLocalHost = require('check-localhost');

module.exports = {
    
    createUrl: function (s, app) {
        if (this.getPort(s, app)) {
            return `${this.getProtocol(s, app)}://${this.getHost(s, app)}:${this.getPort(s, app)}`;
        } else {
            return `${this.getProtocol(s, app)}://${this.getHost(s, app)}`;
        }
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
    getRemoteAddr: function(s){
        if(this.isGenericType(s)){
            return s.generic.host;
        }else{
            return s.cloud.instance.getAddress();
        }
    },
    getProtocol: function (s, app) {
        if (this.isTerminalType(app)) {
            return "file";
        }
        return app.protocol || "http";
    },
    getInstanceName: function(i){
        if(this.isGenericType(i)){
            return i.generic.name;
        }else if(this.isAWSType(i)){
            return i.cloud.instanceName;
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
    isLocalHost: function(s){
        return checkLocalHost(this.getRemoteAddr(s));
    },
    isAWSType: function(c){
        c = ((c && c.type)?c.type:c);
        return c === 'aws';
    },
    isGenericType: function(c){
        c = ((c && c.type)?c.type:c);
        return c === 'generic';
    },
    toHumanSize: function(size){
        var hz;
        if (size < 1024) hz = size + ' B';
        else if (size < 1024*1024) hz = (size/1024).toFixed(2) + ' KB';
        else if (size < 1024*1024*1024) hz = (size/1024/1024).toFixed(2) + ' MB';
        else hz = (size/1024/1024/1024).toFixed(2) + ' GB';
        return hz;
    },
    isString: function(s){
        return typeof s === 'string';
    }
}