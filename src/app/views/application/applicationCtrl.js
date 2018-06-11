'use strict';
(function () {
    var app = angular.module('galaxy');
    var ShellFileManager = require('../applications/scullog/ShellFileManager');
    app.controller('ApplicationController', function($uibModalInstance, config, $filter, $scope){
        var vm = this;
        var $dockers = Promise.resolve([]);
        vm.utils = utils;
        vm.data = config.data;
        vm.getSSHInstance = function(){
            return vm.data.instance.applications.filter(function(a){
                return a.type=='ssh'
            })[0];
        }

        vm.notValidSSH = !vm.getSSHInstance();

        vm.data.applicationTypes = angular.copy(utils.getConfiguration().instance.application.types);
        if(utils.isDirectConnection(vm.data.instance)){
            delete vm.data.applicationTypes.custom;
        }

        vm.no = function () {
            $uibModalInstance.dismiss('cancel');
        }

        if(vm.getSSHInstance()){
            var a = vm.getSSHInstance();
            $dockers = utils.getSSH(vm.data.instance, a, db).connect().then((sshTunnel) => {
                return new ShellFileManager({}, sshTunnel, a).listDocker();
            }).catch(() => {
                utils.safeApply($scope, function(){
                    vm.notValidSSH = true;
                })
            });
        }

        vm.yes = function () {
            $uibModalInstance.close.apply($uibModalInstance, arguments);
        };
        

        vm.getDockerNames = function(val, limit){
            var seen = {};
            return $dockers.then(function(dockers){
                 return $filter('limitTo')($filter('filter')(dockers, val)
                     .map((i) => i.name)
                     .filter((item, pos, ary) => {
                         return seen.hasOwnProperty(item) ? false : (seen[item] = true);
                     }), limit);
             })
        }

    });
})();