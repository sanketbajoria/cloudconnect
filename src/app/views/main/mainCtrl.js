var app = angular.module('cloudconnect');

app.controller('MainController', function ($scope, $q, db, galaxyModal, toastr, $timeout, $filter, WorkspaceService, $document, LoaderService, TabFactory, SharingFactory) {
  var vm = this;
  vm.db = db;
  vm.config = config;
  LoaderService.stop();

  $document[0].title = "Cloud Connect" + (WorkspaceService.getWorkspaceName() ? " - " + WorkspaceService.getWorkspaceName() : '');

  cloud.startAutomaticSync(db.getMainRepository());

  TabFactory.init(vm);


  $("body").on("keypress keydown keyup", function (e) {
    if (e.which == 6 && (e.ctrlKey || e.metaKey)) {
      utils.safeApply($scope, function () {
        vm.chromeTabs.showSearch = true;
      })
    }
    if (e.which == 27) {
      utils.safeApply($scope, function () {
        vm.chromeTabs.showSearch = false;
      })
    }
  });


  $scope.$on('tabBeingRemoved', (event, $tab) => {
    TabFactory.removeTab($tab);
  });

  vm.getInstanceName = function (i) {
    return utils.getInstanceName(i);
  }

  vm.getApplicationName = function (app) {
    return utils.getApplicationName(app);
  }

  vm.scullog = function (app) {
    var temp = angular.copy(app);
    temp.type = "scullog";
    temp.protocol = "http";
    return temp;
  }

  vm.webssh = function (app) {
    var temp = angular.copy(app);
    temp.type = "webssh";
    temp.protocol = "http";
    return temp;
  }

  vm.openApp = function (i, app) {
    if (utils.isGenericType(i)) {
      TabFactory.openLocalApp(angular.copy(i), app);
    } else {
      cloud.getCloudInstancesBasedOnInstanceId(db.getMainRepository().getProfile(i.cloud.profileId), i.cloud.instanceName).forEach((ci) => {
        var s = angular.copy(i);
        s.cloud.instance = ci;
        TabFactory.openLocalApp(s, app);
      });
    }
  }

  vm.switchWorkspace = function () {
    galaxyModal.open({
      templateUrl: 'workspace/workspace.html',
      controller: 'WorkspaceController',
      controllerAs: 'workspaceCtrl',
      resolve: {
        "isStarting": false
      }
    }).result.catch(angular.noop);
  }

  vm.updateProfile = function (profile) {
    galaxyModal.open({
      templateUrl: 'profile/profile.html',
      controller: 'ProfileController',
      controllerAs: 'profileCtrl',
      resolve: {
        profileId: db.getUniqueId(profile),
        editMode: !!profile
      }
    }).result.then(function () {
      initProfiles();
    }).catch(angular.noop);
  }

  vm.updateInstance = function (profile, instance) {
    galaxyModal.open({
      templateUrl: 'instance/instance.html',
      controller: 'InstanceController',
      controllerAs: 'instanceCtrl',
      windowClass: 'fullScreen',
      resolve: {
        profile: profile,
        instanceId: db.getUniqueId(instance),
        editMode: !!instance
      }
    }).result.then(function () {
      initProfiles();
    }).catch(angular.noop);
  }

  vm.removeInstance = function (profile, instance) {
    galaxyModal.open({
      data: {
        heading: `Delete '${vm.getInstanceName(instance)}' Instance`,
        body: "Do you really want to remove this instance detail from galaxy?"
      }
    }).result.then(function () {
      db.getMainRepository().removeInstance(instance);
      initProfiles();
      toastr.success("Instance detail removed successfully", "Success");
    }).catch(angular.noop);
  }

  vm.removeProfile = function (p) {
    galaxyModal.open({
      data: {
        heading: `Delete '${p.name}' Profile`,
        body: "Do you really want to delete profile and all associated instances detail?"
      }
    }).result.then(function () {
      db.getMainRepository().removeProfile(p);
      initProfiles();
      toastr.success("Profile removed successfully", "Success");
    }).catch(angular.noop);
  }

  vm.openShare = function(){
    SharingFactory.openShareModal(db);
  }

  initProfiles();

  function initProfiles() {
    vm.profiles = db.getMainRepository().findProfiles();
    vm.profiles.forEach((p) => {
      p.instances = vm.db.getMainRepository().findInstances({}, p);
    });
  }
});

