var app = angular.module('galaxy', []);
app.controller('MainController', function ($scope, $q) {
    var vm = this;


    var $chromeTabs = $('.chrome-tabs').chromeTabs({ views: 'webviews', allowDoubleClick: false  });

    $chromeTabs._ = $chromeTabs.data('chromeTabs');
    
    var $chromeTabViews = $chromeTabs._.$views; // jQuery wrapper for `.chrome-tabs > .-views`.
    $chromeTabViews._ = $chromeTabViews.data('chromeTabViews'); // ChromeTabViews class instance.
    
    $chromeTabViews.on('viewAdded', function (event, view, instance){
        var $terminal = view.find('.sshTerminal'); 
        if($terminal.length>0){
           require('./term')($terminal, devTunnel);
        } 
    }); 
    
    devTunnel.on(SSHTunnel.CHANNEL.SSH, function () {
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
       
    });


    vm.server = JSON.parse(require('fs').readFileSync(__dirname + "/config.json", 'utf-8'));
    vm.openServer = function (s) {
        $q.when(s.tunnel ? devTunnel.addTunnel({name: s.name, remoteAddr: s.host, remotePort: s.port}) : '').then(function (t) {
            s._tunnel = t;
            if (s.type == 'scullog' || !s.type) {
                devTunnel.getSocksPort().then(function(port){
                    addTab(s, utils.createUrl(s), utils.createProxyUrl(port));    
                })
            } else if (s.type == 'couchdb') {
                couchDb.addIfNotExist(s).then(function (c) {
                    s._couch = c;
                    addTab(s, utils.createCouchUrl(s));
                });
            }
        });
    }

    function addTab(s, url, proxyUrl) {
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
            }
        }
        if(s.socks){
            tabConfig["proxyUrl"] = proxyUrl;
        }
        $chromeTabs._.addTab(tabConfig);
    }

});
