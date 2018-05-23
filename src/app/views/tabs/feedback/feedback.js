angular.module('galaxy').directive('feedback', function () {
    return {
        restrict: 'E',
        replace: true,
        controllerAs: 'feedbackCtrl',
        templateUrl: 'tabs/feedback/feedback.html',
        controller: function ($scope, $interval, galaxyModal, $element) {
            var vm = this;
            var funnyMessages = utils.getConfiguration().funnyMessages;
            vm.funnyMessage = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
            var $funny = $interval(function () {
                vm.funnyMessage = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
            }, 2000);

            vm.sshConnections = [];

            var ssh = $scope.ssh;
            ssh.on("ssh", function () {
                var uniqueId = arguments[1].config.uniqueId;
                var name = arguments[1].config.name;
                var con = vm.sshConnections.filter(s => s.uniqueId == uniqueId && s.type == 'ssh')[0];
                if (!con) {
                    con = { uniqueId: uniqueId, config: arguments[1].config, type: "ssh" };
                    vm.sshConnections.push(con);
                }
                con.status = arguments[0];
                if (arguments[0] == 'disconnect') {
                    con.err = arguments[2] && arguments[2].err;
                    $scope.api.showErrorView($element, con.message, true);
                }
            }).on("tunnel", function () {
                var cfg = arguments[2].tunnelConfig;
                var prefix = "Forward"
                if (cfg && cfg.name == "__socksServer") {
                    prefix = "Reverse"
                }
                var con = vm.sshConnections.filter(s => s.uniqueId == cfg.name && s.type=='tunnel')[0];
                if (!con) {
                    cfg.prefix = prefix;
                    con = { uniqueId: cfg.name, config: cfg, type: "tunnel", status: 'beforeconnect' };
                    vm.sshConnections.push(con);
                }
                con.status = arguments[0];
                if (arguments[0] == 'disconnect') {
                    $scope.api.showErrorView($element, con.message, true);
                }
            });

            vm.openConnectionStatus = function () {
                galaxyModal.open({
                    templateUrl: 'connectionView/connectionView.html',
                    keyboard: true,
                    backdrop: 'static',
                    windowClass: 'connectionView',
                    data: {
                        sshConnections: vm.sshConnections
                    }
                }).result.then(function (data) {
                    //
                })
            }

            $scope.api.showErrorView = function (view, err, sshFailed) {
                utils.safeApply($scope, function () {
                    $interval.cancel($funny);
                    vm.sshFailed = sshFailed;
                    vm.errorDescription = err;
                    vm.displayError = true;
                });
                view.find(".-feedback").toggle(true);
                view.find(".-main-view").toggle(false);
            }

            $scope.api.showMainView = function (view) {
                $interval.cancel($funny);
                view.find(".-main-view").toggle(true);
                view.find(".-feedback").toggle(false);
            }

            $scope.$tab.trigger('loaderInitialized');
        }
    }
});