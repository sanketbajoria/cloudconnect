'use strict';
(function () {
    var app = angular.module('galaxy');

    function ModalController($log, $uibModalInstance, config) {
        var vm = this;
        vm.data = config.data;
        vm.yes = function () {
            $uibModalInstance.close.apply($uibModalInstance, arguments);
        };

        vm.no = function () {
            $uibModalInstance.dismiss('cancel');
        };

        vm.init = function () {
            $log.debug('ModalCtrl.init() invoked ...');
        };
        vm.hasSSHInstance = function(){
            if(vm.instance.applications.length==0 ){
              return vm.data.app.filter(function(a){
                  return a.type=='ssh'
              }).length>0
            }
      };

        vm.init();
    }

    function galaxyModal($uibModal){
        function openModal(config){
            config = angular.merge({}, {
                size: 'md',
                backdrop: 'static',
                animation: true,
                keyboard: true,
                templateUrl: './modal/confirm.html',
                controller: 'ModalController',
                controllerAs: 'vm',
                windowClass: 'galaxyModal',
                resolve: {
                    config: function () {
                        return config;
                    }
                }
            }, config);
            return $uibModal.open(config);
        }

        return {
            open: openModal
        }
    }
    

    app.controller('ModalController', ModalController);
    app.factory('galaxyModal', galaxyModal);
})();