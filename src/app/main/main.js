var app = angular.module('galaxy');

app.controller('MainController', function ($scope, $q, db, galaxyModal, toastr, $timeout) {
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
            utils.getSSH(s, app, db).then((tunnel) => {
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


    vm.openApp = function(s, app){
        var $tab = addTab(s, app); 
        utils.getSSH(s, app, db).then((sshTunnel) => {
            if(utils.isTerminalType(app)){
                updateTab($tab, s, app, utils.createUrl(s, app));
            }else if(utils.isScullogType(app)){
                new scullog(sshTunnel, app).then(function (p) {
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
            
            
            /* $q.when(utils.isForwardConnection(s) ? utils.getTunnel(s).addTunnel({name: utils.getInstanceName(s), remoteAddr: utils.getRemoteAddr(s), remotePort: app.port}) : '').then(function (t) {
                s._tunnel = t;
                if (utils.isCouchDBType(app)) {
                    couchDb.addIfNotExist(s, app).then(function (c) {
                        s._couch = c;
                        updateTab($tab, s, utils.createCouchUrl(s));
                    });
                } else if(utils.isScullogType(s)){
                    new scullog(utils.getTunnel(s)).then(function (p) {
                        s._scullog = {port: p};
                        updateTab($tab, s, utils.createScullogUrl(s));
                    });         
                } else {
                    updateTab($tab, s, utils.createUrl(s, app));
                } 
            }); */
        
    }
    
    vm.updateProfile = function(profile){
        galaxyModal.open({
            templateUrl: 'profile/profile.html',
            controller: 'ProfileController',
            controllerAs: 'profileCtrl',
            resolve: {
                db: db,
                profile: profile,
                editMode: !!profile
            }
        })
    }

    vm.updateInstance = function(profile, instance){
        galaxyModal.open({
            templateUrl: 'instance/instance.html',
            controller: 'InstanceController',
            controllerAs: 'instanceCtrl',
            windowClass: 'fullScreen',
            resolve: {
                db: db,
                profile: profile,
                instance: instance,
                editMode: !!instance
            }
        })
    }

    vm.removeInstance = function(profile, instance){
        galaxyModal.open({
            data: {
                heading: `Delete '${vm.getInstanceName(instance)}' Instance`,
                body: "Do you really want to remove this instance detail from galaxy?"
            }
         }).result.then(function(){
             db.removeInstance(instance);
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
            db.removeProfile(p);
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
        
        $q.when(utils.isSocksConnection(s)?sshTunnel.getSocksPort():null).then(function(port){
            tabConfig["proxyUrl"] = port?utils.createProxyUrl(port):null;
            vm.chromeTabs.showMainTab($tab);
            vm.chromeTabs.updateTab($tab, tabConfig);
        });
    }

});
