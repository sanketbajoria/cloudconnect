'use strict';

(function () {
  var app = angular.module('galaxy');
  var SharingServer = require('../applications/sharing');
  app.factory("SharingFactory", function (galaxyModal, TabFactory, JWTService) {
    var sharingServer;
    return {
      openShareModal: function (db) {
        galaxyModal.open({
          templateUrl: 'sharingTab/sharingTab.html',
          controller: 'SharingTabController',
          controllerAs: 'sharingTabCtrl',
          size: 'lg',
          resolve: {
            db: db
          }
        }).result.catch(angular.noop)
      },
      startShareServer: function(db, port){
        if(!sharingServer){
          sharingServer = new SharingServer(db);
        }
        var config = utils.getShareServerConfiguration(db);
        return sharingServer.open(port || (config && config.port)).then((p) => {
          if(config){
            config.port = p;
            db.getMainRepository().updateConfiguration(config)
          }else{
            config = {};
            config.type = "shareServer";
            config.port = p;
            config.started = true;
            db.getMainRepository().addConfiguration(config);
          }
          return p;
        });
      },
      stopShareServer: function(db){
        if(sharingServer){
          var config = utils.getShareServerConfiguration(db);
          return sharingServer.close().then(() => {
            sharingServer = null;
            if(config){
              config.started = false;
              db.getMainRepository().updateConfiguration(config);
            }
          });
        }
        return Q.when();
      },
      shareServerUrl: function(db){
        return sharingServer && utils.createSharingUrl(sharingServer.port);
      }
    }
  })
})();
