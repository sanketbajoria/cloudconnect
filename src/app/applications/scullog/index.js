var utils = require('../../utils/utils');

var connections = {};

module.exports = {
  add: function (s, app, sshTunnel, ip) {
    var server = new (require('./scullog'))(sshTunnel, s, app, ip);
    return server.then((scullog) => {
      connections[this.getId(s, app, ip)] = scullog;
      return scullog;
    });
  },
  remove: function (s, ip) {
    var uid = this.getId(s, ip);
    if (connections[uid]) {
      connections[uid].server.close();
      delete connections[uid];
    }
  },
  get: function (s, app, ip) {
    return connections[this.getId(s, app, ip)];
  },
  addIfNotExist: function (s, app, sshTunnel, ip) {
    if (this.get(s, app, ip)) {
      return Q.when(this.get(s, app, ip));
    } else {
      return this.add(s, app, sshTunnel, ip);
    }
  },
  getId: function(s, app, ip){
    return `${app.uniqueId || utils.getRemoteAddr(s)}@${!ip?'0.0.0.0':ip}`; 
  }
}

