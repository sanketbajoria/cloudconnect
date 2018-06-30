'use strict';

(function () {
  var xTerm = require('../applications/term');
  var webssh = require('../applications/webssh');
  var mstsc = require('../applications/mstsc');

  var app = angular.module('cloudconnect');
  app.factory("TabFactory", function ($q) {
    var tabs = {};
    var main;
    return {
      /**
       * Initialized with dom Tab element
       */
      init: function (m) {
        main = m;
      },

      /**
       * Add a new tab
       */
      addTab: function (s, app, ssh) {
        main.chromeTabs.toggle(true);
        var id = new Date().getTime();
        var tabConfig = {
          favicon: utils.getIcon(app) || 'default',
          loadingFavicon: 'loading',
          title: utils.getInstanceName(s),
          __server: s,
          __app: app,
          __id: id,
          __ssh: ssh
        }
        var $tab = main.chromeTabs.addTab(tabConfig);
        $tab.id = id;
        tabs[$tab.id] = {};
        tabs[$tab.id].ssh = ssh;
        return $tab;
      },
      /**
       * Update a tab 
       */
      updateTab: function ($tab, s, app, url, sshTunnel) {
        var tabConfig = {
          url: url,
          favicon: utils.getIcon(app) || 'default',
          loadingFavicon: 'loading',
          title: utils.getInstanceName(s),
          viewAttrs: {
            disablewebsecurity: true,
            webpreferences: 'allowDisplayingInsecureContent=true, zoomFactor=1, webSecurity=false',
            allowpopups: true,
            partition: url
          },
          __server: s,
          __app: app
        }

        $q.when(utils.isSocksConnection(s, app) ? sshTunnel.getSocksPort(app.localPort) : null).then((port) => {
          s._socks = port;
          tabConfig["proxyUrl"] = port ? utils.createProxyUrl(port) : null;
          main.chromeTabs.showMainTab($tab);
          main.chromeTabs.updateTab($tab, tabConfig);
        });
      },

      /**
       * On Tab being removed
       */
      removeTab: function ($tab) {
        let props = $tab.data('props');
        /* if (tabs[props.__id] && tabs[props.__id].ssh) {
          tabs[props.__id].ssh.close();
        }
        if (tabs[props.__id] && tabs[props.__id].term) {
          tabs[props.__id].term.close();
        } */
        /* if(tabs[props.__id] && tabs[props.__id].webssh){
            tabs[props.__id].webssh.close();
        } */
        delete tabs[props.__id];
        main.chromeTabs.toggle(Object.keys(tabs).length != 0);
      },

      /**
       * Open a app
       */
      openLocalApp: function (s, app) {
        var ip = "localhost";
        var ssh = utils.getSSH(s, app, main.db);
        var $tab = this.addTab(s, app, ssh);
        $tab.on('loaderInitialized', () => {
          $q.when(ssh.connect()).then((sshTunnel) => {
            if (utils.isTerminalType(app)) {
              this.updateTab($tab, s, app, utils.createUrl(s, app));
              var view = main.chromeTabs.getView($tab);
              var term = new xTerm(view.find('.sshTerminal'), sshTunnel);
              term.open();
            } else if (utils.isScullogType(app) || utils.isDockerType(app)) {
              scullog.addIfNotExist(s, app, sshTunnel, ip).then((scullog) => {
                s._scullog = scullog;
                this.updateTab($tab, s, app, utils.createScullogUrl(s));
              });
            } else if (utils.isWebSSHType(app)) {
              webssh.addIfNotExist(s, app, sshTunnel, ip).then((webssh) => {
                s._webssh = webssh;
                this.updateTab($tab, s, app, utils.createWebSSHUrl(s, app), sshTunnel);
              });
            } else {
              $q.when(utils.isForwardConnection(s) ? sshTunnel.addTunnel({
                name: utils.getInstanceName(s),
                remoteAddr: utils.getRemoteAddr(s),
                remotePort: app.port,
                localPort: app.localPort
              }) : '').then((t) => {
                s._tunnel = t;
                if (utils.isCouchDBType(app)) {
                  couchDb.addIfNotExist(s, app).then((c) => {
                    s._couch = c;
                    this.updateTab($tab, s, app, utils.createCouchUrl(s, app), sshTunnel);
                  });
                } else if (utils.isMSTSCType(app)) {
                  mstsc.addIfNotExist(s, app, ip).then((c) => {
                    s._mstsc = c;
                    this.updateTab($tab, s, app, utils.createMSTSCUrl(s, app), sshTunnel);
                  });
                } else {
                  this.updateTab($tab, s, app, utils.createUrl(s, app), sshTunnel);
                }
              });
            }
          }).catch((err) => {
            console.log("Error ssh - " + err);
          });
        })
      }
    }
  });
})();
