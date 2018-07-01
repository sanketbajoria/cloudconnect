const configPath = __dirname + "/../config.json";
var fs = require('fs');
var checkLocalHost = require('check-localhost');
var config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
var net = require('net');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var Q = require('Q');
var os = require('os');
var clone = require('clone');
var xTerm = require('../applications/term');
var webssh = require('../applications/webssh');
var mstsc = require('../applications/mstsc');
var scullog = require('../applications/scullog');

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
  getApplicationName: function (app) {
    return app.name || config.instance.application.types[app.type].label
  },
  createCouchUrl: function (s, app) {
    return `http://localhost:${s._couch.port}`;
  },
  createWebSSHUrl: function (s, app) {
    return `http://localhost:${s._webssh.port}`;
  },
  createMSTSCUrl: function (s, app) {
    return `http://localhost:${s._mstsc.port}`;
  },
  createScullogUrl: function (s) {
    return `http://localhost:${s._scullog.port}`;
  },
  createLocalUrl: function (port) {
    return `http://localhost:${port}`;
  },
  createRemoteUrl: function (ip, port) {
    return `http://${ip}:${port}`;
  },
  createProxyUrl: function (port) {
    return `socks5://localhost:${port}`;
  },
  isCouchDBType: function (app) {
    var type = app.type || app;
    return type === "couchdb"
  },
  isTerminalType: function (app) {
    var type = app.type || app;
    return type === "ssh"
  },
  isScullogType: function (app) {
    var type = app.type || app;
    return type === "scullog"
  },
  isWebSSHType: function (app) {
    var type = app.type || app;
    return type === "webssh"
  },
  isCustomType: function (app) {
    var type = app.type || app;
    return type === "custom"
  },
  isHttpType: function (app) {
    var type = app.type || app;
    return type === "http"
  },
  isDockerType: function (app) {
    var type = app.type || app;
    return type === "docker"
  },
  isMSTSCType: function (app) {
    var type = app.type || app;
    return type === "mstsc"
  },
  isForwardConnection: function (s) {
    return s.connection && s.connection.type === "forward";
  },
  isSocksConnection: function (s, app) {
    return !this.isTerminalType(app) && !this.isScullogType(app) && !this.isWebSSHType(app) && !this.isDockerType(app) && s.connection && s.connection.type === "socks";
  },
  isDirectConnection: function (s) {
    return s.connection && s.connection.type === "direct";
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
    return function (cb) {
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
  getSSH: function (s, app, db) {
    var i = s;
    var instances = (this.isTerminalType(app) || this.isScullogType(app) || this.isWebSSHType(app) || (!s.isLocalHost && this.isDockerType(app))) ? [s] : [];
    if (instances.length > 0 && !this.isGenericType(i) && (!s.cloud.instance || !s.cloud.instance.getAddress)) {
      i.cloud.instance = cloud.getCloudInstancesBasedOnInstanceId(db.getMainRepository().getProfile(s.cloud.profileId), i.cloud.instanceName)[0];
    }
    while (i = i.connection.ref) {
      i = db.getMainRepository().getInstance(i);
      if (!this.isGenericType(i)) {
        i.cloud.instance = cloud.getCloudInstancesBasedOnInstanceId(db.getMainRepository().getProfile(i.cloud.profileId), i.cloud.instanceName)[0];
      }
      instances.push(i);
    }
    var sshConfigs = instances.reverse().map((instance) => {
      var sshApp = instance.applications.filter((a) => {
        return this.isTerminalType(a);
      })[0];
      var sshConfig = {
        username: sshApp.config.userName,
        host: this.getRemoteAddr(instance),
        port: sshApp.port,
        reconnect: false
      };
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
  },
  isPortReachable: (port, opts) => {
    opts = Object.assign({
      timeout: 2000
    }, opts);

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
  },
  getIcon: function (app) {
    if (this.isWebSSHType(app) || this.isTerminalType(app)) {
      return 'ssh';
    } else if (this.isMSTSCType(app)) {
      return 'mstsc';
    } else if (this.isCustomType(app)) {
      return 'custom';
    } else if (this.isScullogType(app) || this.isDockerType(app)) {
      return 'scullog';
    }
  },
  getTitle: function (props) {
    if (utils.isScullogType(props.__app) || utils.isWebSSHType(props.__app) || utils.isTerminalType(props.__app) || utils.isMSTSCType(props.__app)) {
      return props.title
    } else if (utils.isDockerType(props.__app)) {
      return `${props.__app.config.dockerName}@${props.title}`;
    }
  },
  createJWTToken: function (data, secret) {
    return jwt.sign(data, secret, {});
  },
  verifyAndExtractToken: function (db, tokenValue) {
    //exists in database and not expired
    //decompile with found token secret
    //tokenId in secret === token databaseId
    if(tokenValue){
      try {
        var token = db.getMainRepository().findSharings({value: tokenValue})[0];
        if(token && token.active){
          if(token.expiresAt > new Date().getTime()){
            var data = jwt.verify(tokenValue, token.secret);
            if(data.tokenId == db.getUniqueId(token)){
              return token;
            }
          } 
        }
      } catch (err) {
        //Token doesn't got verified
      }
    }
    return false;
  },
  verifyAndExtractServer: function (db, tokenValue, server){
    var token = this.verifyAndExtractToken(db, tokenValue);
    if(token && server){
      var port = null;
      if(typeof server === "string"){
        try{
          var serverVal = jwt.verify(server, token.secret);
          if(serverVal && serverVal.server){
            port = serverVal.p;
            server = serverVal.server
          }else{
            return false;
          }
        }catch(err){
          return false;
        }
      }
      var profileId = Object.keys(server)[0];
      if(profileId && token.sharing[profileId]){
        var instanceId = Object.keys(server[profileId])[0];
        if(instanceId && token.sharing[profileId][instanceId]){
          var appId = Object.keys(server[profileId][instanceId])[0];
          if(appId && token.sharing[profileId][instanceId][appId]){
            var server = db.getMainRepository().getInstance(instanceId);
            if(server){
              var app = utils.getSharingApplications(server.applications).filter(a => a.uniqueId == appId)[0];
              if(app){
                return [server, app, port]; 
              }
            }
          }
        }
      }
    }
    return false;
  },
  createSecret: function(len){
    return crypto.randomBytes(len || 64).toString('hex');
  },
  isSharingApp: function(app){
    return utils.isTerminalType(app) || utils.isWebSSHType(app) || utils.isScullogType(app) || utils.isMSTSCType(app) || utils.isHttpType(app);
  },
  getShareServerConfiguration: function(db){
    return db.getMainRepository().findConfigurations({type: 'shareServer'})[0];
  },
  openShareApp: function (s, app, db) {
    var ip = "localhost";
    var ssh = utils.getSSH(s, app, db);
    return Q.when(ssh.connect()).then((sshTunnel) => {
      if (utils.isTerminalType(app) || utils.isWebSSHType(app)) {
        return webssh.addIfNotExist(s, app, sshTunnel, ip).then((webssh) => {
          return webssh.port;
        });
      } else if (utils.isScullogType(app) || utils.isDockerType(app)) {
        return scullog.addIfNotExist(s, app, sshTunnel, ip).then((scullog) => {
          return scullog.port;
        });
      } else {
        return Q.when(utils.isForwardConnection(s) ? sshTunnel.addTunnel({
          name: utils.getInstanceName(s),
          remoteAddr: utils.getRemoteAddr(s),
          remotePort: app.port
        }) : '').then((t) => {
          s._tunnel = t;
          if (utils.isCouchDBType(app)) {
            return couchDb.addIfNotExist(s, app).then((c) => {
              return c.port;
            });
          } else if (utils.isMSTSCType(app)) {
            return mstsc.addIfNotExist(s, app, ip).then((c) => {
              return c.port;
            });
          } else {
            return app.localPort;
          }
        });
      }
    });
  },
  getExternalIPs: function(){
    var ifaces = os.networkInterfaces();
    var ret = [];
    Object.keys(ifaces).forEach(function (ifname) {
      ifaces[ifname].forEach(function (iface) {
        if ('IPv4' !== iface.family || iface.internal !== false) {
          return;
        }
        ret.push(iface.address);
      });
    });
    return ret;
  },
  createSharingUrl: function(port){
    var externalIP = utils.getExternalIPs()[0];
    if(externalIP){
      return utils.createRemoteUrl(externalIP, port);
    }
  },
  getSharingApplications: function(applications){
    return applications.reduce((r, a) => {
      if (utils.isSharingApp(a)) {
        if (utils.isTerminalType(a)) {
          var scullogApp = clone(a);
          scullogApp.uniqueId += "scullog";
          scullogApp.type = "scullog";
          scullogApp.name = "scullog"
          scullogApp.protocol = "http";
          r.push(scullogApp);
          var websshApp = clone(a);
          websshApp.uniqueId += "webssh";
          websshApp.type = "webssh";
          websshApp.name = "ssh";
          websshApp.protocol = "http";
          r.push(websshApp);
        } else {
          r.push(a);
        }
      }
      return r;
    }, [])
  }
}

