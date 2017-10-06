module.exports = {
    createUrl: function (s) {
        if (this.getPort(s)) {
            return `${this.getProtocol(s)}://${this.getHost(s)}:${this.getPort(s)}`;
        } else {
            return `${this.getProtocol(s)}://${this.getHost(s)}`;
        }
    },
    getPort: function (s) {
        if (s._tunnel && this.isForwardConnection(s))
            return s._tunnel.localPort;
        return s.port;
    },
    getHost: function (s) {
        if (this.isTerminalType(s)) {
            return __dirname + "/../term/index.html";
        } else {
            return (s._tunnel && this.isForwardConnection(s)) ? "localhost" : s.host;
        }
    },
    getProtocol: function (s) {
        if (this.isTerminalType(s)) {
            return "file";
        }
        return s.protocol || "http";
    },
    createCouchUrl: function (s) {
        return `${s.protocol}://localhost:${s._couch.port}`;
    },
    createScullogUrl: function (s) {
        return `http://localhost:${s._scullog.port}`;
    },
    createProxyUrl: function (port) {
        return `socks5://localhost:${port}`;
    },
    isCouchDBType: function (s) {
        return s.type === "couchdb"
    },
    isTerminalType: function (s) {
        return s.type === "terminal"
    },
    isScullogType: function (s) {
        return s.type === "scullog"
    },
    isForwardConnection: function (s) {
        return s.connection && s.connection.type === "forward";
    },
    isSocksConnection: function (s) {
        return s.connection && s.connection.type === "socks";
    },
    isDirectConnection: function (s) {
        return s.connection && s.connection.type === "direct";
    }
}