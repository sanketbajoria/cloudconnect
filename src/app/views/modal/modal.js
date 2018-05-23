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
        vm.init();
    }

    function galaxyModal($uibModal){
        function openModal(config){
            config.resolve = config.resolve || {};
            config.resolve.config = function () {
                return config;
            }; 
            config = Object.assign({
                size: 'md',
                backdrop: 'static',
                animation: true,
                keyboard: false,
                templateUrl: 'modal/confirm.html',
                controller: 'ModalController',
                controllerAs: 'vm',
                windowClass: 'galaxyModal',
            }, config);
            var ret = $uibModal.open(config);
            ret.result.catch(() => {});
            return ret;
        }

        return {
            open: openModal
        }
    }
    

    app.controller('ModalController', ModalController);
    app.factory('galaxyModal', galaxyModal);
})();