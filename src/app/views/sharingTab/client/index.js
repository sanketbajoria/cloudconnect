var app = angular.module('cloudconnect', []);
app.controller("AppController", function($http, $window){
    var vm = this;
    vm.submitToken = function (){
        $http.post("/cloudconnectToken", {token: vm.token}).then(function(res){
            if(res.status == 200 || res.status == 201){
                vm.profiles = res.data;
            }
        });
    }
    $http.get("/cloudconnectServers").then(function(res){
        if(res.status == 200 || res.status == 201){
            vm.profiles = res.data;
        }
    });
    vm.selectServer = function (pId, sId, aId){
        var server = {};
        server[pId] = {};
        server[pId][sId] = {};
        server[pId][sId][aId] = true;
        vm.loading = true;
        $http.post("/cloudconnectServers", {server: server}).then(function(res){
            if(res.status == 200 || res.status == 201){
                window.location.reload(true);
            } 
        }).catch(function(res){
            vm.loading = false;
            console.log(res.data);
        });
    }

    

    vm.logoutUrl = $window.location.protocol + "//" + $window.location.hostname + ":" + $window.location.port + "/cloudconnectLogout";
});