var WebSSH = require('./WebSSH');
var utils = require('../../utils/utils');

var connections = {};

module.exports = {
  add: function (s, app, sshTunnel) {
    var uid = utils.getRemoteAddr(s, app);
    var server = new WebSSH({}, sshTunnel);
    return server.open().then((p) => {
      server.port = p;
      connections[uid] = server;
      return server;
    });
  },
  remove: function (s) {
    var uid = utils.getRemoteAddr(s);
    if (connections[uid]) {
      connections[uid].server.close();
      delete connections[uid];
    }
  },
  get: function (s, app) {
    return connections[utils.getRemoteAddr(s)];
  },
  addIfNotExist: function (s, app, sshTunnel) {
    if (this.get(s, app)) {
      return Q.when(this.get(s, app));
    } else {
      return this.add(s, app, sshTunnel);
    }
  }
}

