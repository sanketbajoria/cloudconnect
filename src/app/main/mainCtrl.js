var app = angular.module('galaxy');
var Q = require('q');
var tunnels = {};
app.controller('MainController', function ($scope, $q, db, galaxyModal, toastr, $timeout, $filter) {
    var vm = this;
    vm.tabCount = 0;
    vm.db = db;
    vm.config = JSON.parse(require('fs').readFileSync(__dirname + "/config.json", 'utf-8'));
    /*  Object.keys(vm.server.tunnels).reduce(function(r, k){
        r[k] = new SSHTunnel(vm.server.tunnels[k]);
        r[k].connect();
        return r;
    }, {}) *///;

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

    $scope.$on('viewAdded', function (event, view, instance, props){
        var s = props.__server;
        var app = props.__app;
        if(utils.isTerminalType(app)){
            getSSH(s, app).then((tunnel) => {
                require('./term')(view.find('.sshTerminal'), tunnel);
            })
        }
    });

    $scope.$on('tabRemoved', function(){
        --vm.tabCount;
        vm.chromeTabs.toggle(vm.tabCount!= 0);
    });

    /* devTunnel.on(SSHTunnel.CHANNEL.SSH, function () {
        if (!$scope.$$phase) {
            $scope.$apply(function () {
                console.log("SSH - " + arguments);
            });
        } else {
            console.log("SSH - " + arguments);
        }

    });
    devTunnel.on(SSHTunnel.CHANNEL.TUNNEL, function () {
        if (!$scope.$$phase) {
            $scope.$apply(function(){
                console.log("Tunnel - " + arguments);
            });
        } else {
            console.log("Tunnel - " + arguments);
        }
    }); */
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
            p.instances.forEach((i) => {
                if(!utils.isGenericType(i)){
                    i.cloudInstances = cloud.getCloudInstancesBasedOnInstanceId(db.getMainRepository().getProfile(i.cloud.profileId), i.cloud.instanceName);
                }
            });
        });
    }

    initProfiles();
   
    vm.openApp = function(i, app){
        if(utils.isGenericType(i)){
            openApp(i, app);
        }else{
            i.cloudInstances.forEach((ci) => {
                var s = i;//angular.copy(Object.assign({}, i, {cloudInstances: undefined}));
                s.cloud.instance = ci;
                openApp(s, app);
            });
        }
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

    function addTab(s, app){
        ++vm.tabCount;
        vm.chromeTabs.toggle(true);
        var tabConfig = {
            favicon: 'default',
            loadingFavicon: 'loading',
            title: utils.getInstanceName(s), 
            __server: s,
            __app: app
        }
        return vm.chromeTabs.addTab(tabConfig);
    }

    function openApp(s, app){
        var $tab = addTab(s, app); 
        getSSH(s, app).then((sshTunnel) => {
            if(utils.isTerminalType(app)){
                updateTab($tab, s, app, utils.createUrl(s, app));
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
        });
    }

    function updateTab($tab, s, app, url, sshTunnel) {
        var tabConfig = {
            url: url,
            favicon: 'default',
            loadingFavicon: 'loading',
            title: utils.getInstanceName(s), 
            viewAttrs: {
                disablewebsecurity: true,
                webpreferences: 'allowDisplayingInsecureContent, zoomFactor=1, webSecurity=false',
                allowpopups: true,
                partition: url
            },
            __server: s,
            __app: app
        }
        
        $q.when(utils.isSocksConnection(s, app)?sshTunnel.getSocksPort():null).then(function(port){
            tabConfig["proxyUrl"] = port?utils.createProxyUrl(port):null;
            vm.chromeTabs.showMainTab($tab);
            vm.chromeTabs.updateTab($tab, tabConfig);
        });
    }

    function getTunnelFromCache(i, sshConfig){
        var id = db.getUniqueId(i);
        if(!tunnels[id] && sshConfig){
            tunnels[id] = new SSHTunnel(sshConfig);
        }
        return tunnels[id];
    }
    

    function getSSH(s, app){
        var lastSSH, i = s;
        var instances = (utils.isTerminalType(app) || utils.isScullogType(app))?[s]:[];   
        while(i = i.connection.ref){
            i = db.getMainRepository().getInstance(i);
            if(!utils.isGenericType(i)){
                i.cloud.instance = cloud.getCloudInstancesBasedOnInstanceId(db.getMainRepository().getProfile(i.cloud.profileId), i.cloud.instanceName)[0];
            }
            instances.push(i);
        }
        while(i=instances.pop()){
            (function(instance){
                var sshApp = instance.applications.filter(function(a){
                    return utils.isTerminalType(a);
                })[0];
                var sshConfig = {username:sshApp.config.userName, host: utils.getRemoteAddr(instance), port: sshApp.port};
                if(sshApp.config.secret.key == 'password'){
                    sshConfig.password = sshApp.config.secret.password
                }else{
                    sshConfig.identity = sshApp.config.secret.pem.file.path;
                }
                if(!lastSSH){
                    lastSSH = getTunnelFromCache(instance, sshConfig).connect(sshConfig);
                }else {
                    lastSSH = lastSSH.then((ssh) => {
                        return ssh.spawnCmd(`nc ${utils.getRemoteAddr(instance)} ${sshApp.port}`);
                    }).then((stream) => {
                        sshConfig.sock = stream;
                        return getTunnelFromCache(instance, sshConfig).connect(sshConfig);
                    });
                }
                lastSSH = lastSSH.catch((err) => {
                    return Q.reject(`Unable to connect to ${utils.getInstanceName(instance)} -- ${err}`)
                });
            })(i) 
        }
        return Q.when(lastSSH);
    }

});
