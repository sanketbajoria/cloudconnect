angular.module('galaxy').directive('custom', function () {
    return {
        restrict: 'E',
        replace: true,
        controllerAs: 'CustomCtrl',
        templateUrl: 'tabs/custom/custom.html',
        controller: function ($scope, $element) {
            var s = $scope.server;
            var vm = this;
            vm.getTunnel = function(){
                return (s._tunnel && utils.isForwardConnection(s))?"Forward":"Socks";
            }
            vm.getPort = function(){
                return (s._tunnel && utils.isForwardConnection(s))?s._tunnel.localPort:s._socks;
            }
            vm.getHost = function(){
                return (s._tunnel && utils.isForwardConnection(s)) ? "localhost" : utils.getRemoteAddr(s);
            }
        }
    }
});