var app = angular.module('galaxy');
var xTerm = require('../applications/term');
var webssh = require('../applications/webssh');
var mstsc = require('../applications/mstsc');

app.controller('MainController', function ($scope, $q, db, galaxyModal, toastr, $timeout, $filter, WorkspaceService, $document, LoaderService, TabFactory) {
    var vm = this;
    vm.db = db;
    vm.config = config;
    LoaderService.stop();
    
    $document[0].title = "GalaxyBot" + (WorkspaceService.getWorkspaceName()?" - " + WorkspaceService.getWorkspaceName():'');
    
    cloud.startAutomaticSync(db.getMainRepository());
    
    TabFactory.init(vm);

    
    $("body").on("keypress keydown keyup", function (e) {
        if(e.which == 6 && (e.ctrlKey || e.metaKey)){
            $scope.$apply(function(){
                vm.chromeTabs.showSearch = true;
            })
        }
        if(e.which == 27){
            $scope.$apply(function(){
                vm.chromeTabs.showSearch = false;
            })
        }
    });


    $scope.$on('tabBeingRemoved', (event, $tab) => {
        TabFactory.removeTab($tab);
    });

    vm.getInstanceName = function(i){
        return utils.getInstanceName(i);
    }

    vm.scullog = function(app){
        var temp = angular.copy(app);
        temp.type = "scullog";
        temp.protocol = "http";
        return temp;
    }

    vm.webssh = function(app){
        var temp = angular.copy(app);
        temp.type = "webssh";
        temp.protocol = "http";
        return temp;
    }
   
    vm.openApp = function(i, app){
        if(utils.isGenericType(i)){
            openApp(angular.copy(i), app);
        }else{
            cloud.getCloudInstancesBasedOnInstanceId(db.getMainRepository().getProfile(i.cloud.profileId), i.cloud.instanceName).forEach((ci) => {
                var s = angular.copy(i);
                s.cloud.instance = ci;
                openApp(s, app);
            });
        }
    }

    vm.switchWorkspace = function(){
        galaxyModal.open({
            templateUrl: 'workspace/workspace.html',
            controller: 'WorkspaceController',
            controllerAs: 'workspaceCtrl',
            resolve: {
                "isStarting": false
            }
        }).result.catch(angular.noop);
    }
    
    vm.updateProfile = function(profile){
        galaxyModal.open({
            templateUrl: 'profile/profile.html',
            controller: 'ProfileController',
            controllerAs: 'profileCtrl',
            resolve: {
                profileId: db.getUniqueId(profile),
                editMode: !!profile
            }
        }).result.then(function(){
            initProfiles();
        }).catch(angular.noop);
    }

    vm.updateInstance = function(profile, instance){
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
        }).result.then(function(){
            initProfiles();
        }).catch(angular.noop);
    }

    vm.removeInstance = function(profile, instance){
        galaxyModal.open({
            data: {
                heading: `Delete '${vm.getInstanceName(instance)}' Instance`,
                body: "Do you really want to remove this instance detail from galaxy?"
            }
         }).result.then(function(){
             db.getMainRepository().removeInstance(instance);
             initProfiles();
             toastr.success("Instance detail removed successfully", "Success");
         }).catch(angular.noop);
    }

    vm.removeProfile = function(p){
        galaxyModal.open({
           data: {
               heading: `Delete '${p.name}' Profile`,
               body: "Do you really want to delete profile and all associated instances detail?"
           }
        }).result.then(function(){
            db.getMainRepository().removeProfile(p);
            initProfiles();
            toastr.success("Profile removed successfully", "Success");
        }).catch(angular.noop);
    }

    initProfiles();

    function openApp(s, app){
        var ssh = utils.getSSH(s, app, db);
        var $tab = TabFactory.addTab(s, app, ssh); 
        $tab.on('loaderInitialized', function(){
            $q.when(ssh.connect()).then((sshTunnel) => {
                if(utils.isTerminalType(app)){
                    TabFactory.updateTab($tab, s, app, utils.createUrl(s, app));
                    var view = vm.chromeTabs.getView($tab);
                    var term = new xTerm(view.find('.sshTerminal'), sshTunnel);
                    term.open();
                }else if(utils.isScullogType(app) || utils.isDockerType(app)){
                    new scullog(sshTunnel, s, app).then(function (p) {
                        s._scullog = {port: p};
                        TabFactory.updateTab($tab, s, app, utils.createScullogUrl(s));
                    });
                } else if (utils.isWebSSHType(app)) {
                    webssh.addIfNotExist(s, app, sshTunnel).then(function (webssh) {
                        s._webssh = webssh;
                        TabFactory.updateTab($tab, s, app, utils.createWebSSHUrl(s, app), sshTunnel);
                    });
                }else {
                    $q.when(utils.isForwardConnection(s) ? sshTunnel.addTunnel({name: utils.getInstanceName(s), remoteAddr: utils.getRemoteAddr(s), remotePort: app.port, localPort: app.localPort}) : '').then(function (t) {
                        s._tunnel = t;
                        if (utils.isCouchDBType(app)) {
                            couchDb.addIfNotExist(s, app).then(function (c) {
                                s._couch = c;
                                TabFactory.updateTab($tab, s, app, utils.createCouchUrl(s, app), sshTunnel);
                            });
                        }else if(utils.isMSTSCType(app)){
                            mstsc.addIfNotExist(s, app).then(function (c) {
                                s._mstsc = c;
                                TabFactory.updateTab($tab, s, app, utils.createMSTSCUrl(s, app), sshTunnel);
                            });
                        }{
                            TabFactory.updateTab($tab, s, app, utils.createUrl(s, app), sshTunnel);
                        } 
                    });
                }
            }).catch((err) => {
                console.log("Error ssh - " + err);
            });
        })
    }

    function initProfiles(){
        vm.profiles = db.getMainRepository().findProfiles();
        vm.profiles.forEach((p) => {
            p.instances = vm.db.getMainRepository().findInstances({}, p);
        });
    }
});
