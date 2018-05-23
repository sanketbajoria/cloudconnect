var app = angular.module('galaxy');
var Q = require('q');
var xTerm = require('../applications/term');
app.controller('MainController', function ($scope, $q, db, galaxyModal, toastr, $timeout, $filter, WorkspaceService, $document, LoaderService) {
    var vm = this;
    vm.tabs = {};
    vm.db = db;
    vm.config = config;
    LoaderService.stop();
    
    $document[0].title = "GalaxyBot" + (WorkspaceService.getWorkspaceName()?" - " + WorkspaceService.getWorkspaceName():'');
    
    cloud.startAutomaticSync(db.getMainRepository());
    
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
        let props = $tab.data('props');        
        if(vm.tabs[props.__id] && vm.tabs[props.__id].ssh){
            vm.tabs[props.__id].ssh.close();
        }
        if(vm.tabs[props.__id] && vm.tabs[props.__id].term){
            vm.tabs[props.__id].term.close();
        }
        delete vm.tabs[props.__id];
        vm.chromeTabs.toggle(Object.keys(vm.tabs).length!= 0);
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

   function initProfiles(){
        vm.profiles = db.getMainRepository().findProfiles();
        vm.profiles.forEach((p) => {
            p.instances = vm.db.getMainRepository().findInstances({}, p);
            /* p.instances.forEach((i) => {
                if(!utils.isGenericType(i)){
                    i.cloudInstances = cloud.getCloudInstancesBasedOnInstanceId(db.getMainRepository().getProfile(i.cloud.profileId), i.cloud.instanceName);
                }
            }); */
        });
    }

    initProfiles();
   
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
        });
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
        });
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
        })
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
         });
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
        });
    }

    function openApp(s, app){
        var ssh = utils.getSSH(s, app, db);
        var $tab = addTab(s, app, ssh); 
        $tab.on('loaderInitialized', function(){
            ssh.connect().then((sshTunnel) => {
                if(utils.isTerminalType(app)){
                    updateTab($tab, s, app, utils.createUrl(s, app));
                    var view = vm.chromeTabs.getView($tab);
                    var term = new xTerm(view.find('.sshTerminal'), sshTunnel);
                    vm.tabs[$tab.id].term = term;
                    term.open();
                }else if(utils.isScullogType(app) || utils.isDockerType(app)){
                    new scullog(sshTunnel, s, app).then(function (p) {
                        s._scullog = {port: p};
                        updateTab($tab, s, app, utils.createScullogUrl(s));
                    });
                }else {
                    $q.when(utils.isForwardConnection(s) ? sshTunnel.addTunnel({name: utils.getInstanceName(s), remoteAddr: utils.getRemoteAddr(s), remotePort: app.port}) : '').then(function (t) {
                        s._tunnel = t;
                        if (utils.isCouchDBType(app)) {
                            couchDb.addIfNotExist(s, app).then(function (c) {
                                s._couch = c;
                                updateTab($tab, s, app, utils.createCouchUrl(s, app), sshTunnel);
                            });
                        } else {
                            updateTab($tab, s, app, utils.createUrl(s, app), sshTunnel);
                        } 
                    });
                }
            }).catch((err) => {
                console.log("Error ssh - " + err);
            });
        })
    }

    function addTab(s, app, ssh){
        vm.chromeTabs.toggle(true);
        var id = new Date().getTime();
        var tabConfig = {
            favicon: 'default',
            loadingFavicon: 'loading',
            title: utils.getInstanceName(s), 
            __server: s,
            __app: app,
            __id: id,
            __ssh: ssh
        }
        var $tab = vm.chromeTabs.addTab(tabConfig);
        $tab.id = id;
        vm.tabs[$tab.id] = {};
        vm.tabs[$tab.id].ssh = ssh;
        return $tab;
    }

    function updateTab($tab, s, app, url, sshTunnel) {
        var tabConfig = {
            url: url,
            favicon: 'default',
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
        
        $q.when(utils.isSocksConnection(s, app)?sshTunnel.getSocksPort():null).then(function(port){
            s._socks = port;
            tabConfig["proxyUrl"] = port?utils.createProxyUrl(port):null;
            vm.chromeTabs.showMainTab($tab);
            vm.chromeTabs.updateTab($tab, tabConfig);
        });
    }

});
