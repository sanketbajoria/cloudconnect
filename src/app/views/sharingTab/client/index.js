var app = angular.module('galaxybot', []);
app.controller("AppController", function($http){
    var vm = this;
    vm.submitToken = function (){
        $http.post("/galaxybotToken", {token: vm.token}).then(function(res){
            if(res.status == 200 || res.status == 201){
                vm.profiles = res.data;
            }
        });
    }
    $http.get("/galaxybotServers").then(function(res){
        if(res.status == 200 || res.status == 201){
            vm.profiles = res.data;
        }
    });
    vm.selectServer = function (pId, sId, aId){
        var server = {};
        server[pId] = {};
        server[pId][sId] = {};
        server[pId][sId][aId] = true; 
        $http.post("/galaxybotServers", {server: server}).then(function(res){
            if(res.status == 200 || res.status == 201){
                window.location.reload(true);
            }
        });
    }
});