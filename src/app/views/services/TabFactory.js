'use strict';

(function () {
  var app = angular.module('galaxy');
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

        $q.when(utils.isSocksConnection(s, app) ? sshTunnel.getSocksPort(app.localPort) : null).then(function (port) {
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
      }
    }
  });
})();

