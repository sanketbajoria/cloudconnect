var MSTSC = require('./WebMSTSC');
var utils = require('../../utils/utils');

var connections = {};

module.exports = {
  add: function (s, app) {
    var uid = utils.getRemoteAddr(s, app);
    var server = new MSTSC(s, app);
    return server.open().then((p) => {
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
  addIfNotExist: function (s, app) {
    if (this.get(s, app)) {
      return Q.when(this.get(s, app));
    } else {
      return this.add(s, app);
    }
  }
}

