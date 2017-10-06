var app = angular.module('galaxy');
var AWS = require('./cloud/aws.js');

app.controller('MainController', function ($scope, $q, db, galaxyModal) {
    var vm = this;
    vm.chromeTabs = null;
    vm.tabCount = 0;
    vm.db = db;
    vm.config = JSON.parse(require('fs').readFileSync(__dirname + "/config.json", 'utf-8'));
    var tunnels =/*  Object.keys(vm.server.tunnels).reduce(function(r, k){
        r[k] = new SSHTunnel(vm.server.tunnels[k]);
        r[k].connect();
        return r;
    }, {}) */{};

    
    $scope.$on('viewAdded', function (event, view, instance, props){
        var s = props.__server;
        if(utils.isTerminalType(s)){
           require('./term')(view.find('.sshTerminal'), tunnels[s.connection.tunnel]);
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
        if(i.type == 'generic'){
            return i.generic.name;
        }else if(i.type == 'aws'){
            return AWS.getName(i.aws.instance);
        }
    }
    
    vm.openServer = function (s) {
        $q.when(utils.isForwardConnection(s) ? tunnels[s.connection.tunnel].addTunnel({name: s.name, remoteAddr: s.host, remotePort: s.port}) : '').then(function (t) {
            s._tunnel = t;
            if (utils.isCouchDBType(s)) {
                couchDb.addIfNotExist(s).then(function (c) {
                    s._couch = c;
                    addTab(s, utils.createCouchUrl(s));
                });
            } else if(utils.isScullogType(s)){
                scullog(tunnels[s.connection.tunnel]).then(function (p) {
                    s._scullog = {port: p};
                    addTab(s, utils.createScullogUrl(s));
                });         
            } else {
                addTab(s, utils.createUrl(s));
            } 
        });
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

    vm.addInstance = function(profile){
        galaxyModal.open({
            templateUrl: 'instance/instance.html',
            controller: 'InstanceController',
            controllerAs: 'instanceCtrl',
            windowClass: 'fullScreen',
            resolve: {
                db: db,
                profile: profile
            }
        })
    }

    vm.removeProfile = function(p){
        galaxyModal.open({
           data: {
               heading: `Delete '${p.name}' Profile`,
               body: "Do you really want to delete profile and all associated instances detail?"
           }
        }).result.then(function(){
            db.removeProfile(p);
        });
    }


    function addTab(s, url) {
        ++vm.tabCount;
        vm.chromeTabs.toggle(true);

        var tabConfig = {
            url: url,
            favicon: 'default',
            loadingFavicon: 'loading',
            title: s.name, 
            viewAttrs: {
                disablewebsecurity: true,
                webpreferences: 'allowDisplayingInsecureContent, zoomFactor=1, webSecurity=false',
                allowpopups: true,
                partition: url
            },
            __server: s
        }
        
        $q.when(utils.isSocksConnection(s)?tunnels[s.connection.tunnel].getSocksPort():null).then(function(port){
            tabConfig["proxyUrl"] = port?utils.createProxyUrl(port):null;
            vm.chromeTabs.addTab(tabConfig);
        });
    }

});
