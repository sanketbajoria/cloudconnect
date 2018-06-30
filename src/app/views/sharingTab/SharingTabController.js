'use strict';

(function () {
  var app = angular.module('cloudconnect');
  app.controller("SharingTabController", function (SharingFactory, $uibModalInstance, db, $scope) {
    var vm = this;
    vm.db = db;
    vm.no = function () {
      $uibModalInstance.dismiss('cancel');
    }

    vm.getInstanceName = function (s) {
      return utils.getInstanceName(s);
    }

    vm.getApplicationName = function (s, app) {
      return utils.getApplicationName(app);
    }

    vm.toggleShare = function (p, s, enable) {
      s.applications.forEach(a => {
        vm.token.sharing[db.getUniqueId(p)] = vm.token.sharing[db.getUniqueId(p)] || {};
        vm.token.sharing[db.getUniqueId(p)][db.getUniqueId(s)] = vm.token.sharing[db.getUniqueId(p)][db.getUniqueId(s)] || {};
        vm.token.sharing[db.getUniqueId(p)][db.getUniqueId(s)][a.uniqueId] = enable;
      });
    }

    vm.editToken = function (token) {
      vm.token = token;
      vm.editMode = true;
    }

    vm.removeToken = function (token) {
      db.getMainRepository().removeSharing(token);
      vm.updateSharingTokens();
    }

    vm.toggleShareToken = function(token){
      db.getMainRepository().updateSharing(token);
    }

    vm.saveToken = function () {
      var token = vm.token;
      if (vm.editMode) {
        token.expiresAt = new Date().getTime() + (token.expiresIn * 60 * 1000);
        db.getMainRepository().updateSharing(token);
      } else {
        token.createdAt = new Date().getTime();
        token.expiresAt = new Date().getTime() + (token.expiresIn * 60 * 1000);
        token.secret = utils.createSecret();
        token.active = true;
        token = db.getMainRepository().addSharing(token);
        token.value = utils.createJWTToken({
          tokenId: db.getUniqueId(token)
        }, token.secret);
        db.getMainRepository().updateSharing(token);
      }
      vm.updateSharingTokens();
    }

    vm.addNewToken = function () {
      vm.token = {
        expiresIn: 120,
        sharing: {}
      };
      vm.tempServer = {};
      vm.editMode = false;
    }

    vm.updateSharingTokens = function () {
      vm.sharingTokens = db.getMainRepository().findSharings().filter(t => {
        var expiresIn = t.expiresAt - new Date().getTime();
        if (expiresIn < 0) {
          db.getMainRepository().removeSharing(t);
          return false;
        }
        return true;
      });
    }

    vm.init = function () {
      var profiles = db.getMainRepository().findProfiles();
      vm.profiles = profiles.filter(p => {
        p.instances = db.getMainRepository().findInstances({}, p).filter(i => {
          i.applications = utils.getSharingApplications(i.applications);
          return i.applications.length > 0;
        });
        return p.instances.length > 0;
      });
      vm.addNewToken();
      vm.updateSharingTokens();
      vm.sharingUrl = SharingFactory.shareServerUrl() || '';
      vm.serverStatus = vm.sharingUrl?'Stop':'Start';
    }

    vm.init();

    vm.toggleServer = function(){
      if(vm.sharingUrl){
        vm.serverStatus = "Stopping";
        vm.serverUpdating = true;
        SharingFactory.stopShareServer(db).then(() => {
          utils.safeApply($scope, function(){
            vm.sharingUrl = '';
            vm.serverUpdating = false;
            vm.serverStatus= 'Start';
          })
        })
      }else{
        vm.serverStatus = "Starting";
        vm.serverUpdating = true;
        SharingFactory.startShareServer(db, vm.serverPort).then((p) => {
          utils.safeApply($scope, function(){
            vm.sharingUrl = utils.createSharingUrl(p);
            vm.serverUpdating = false;
            vm.serverStatus = "Stop";
          })
        })
      }
    }

  })
})();