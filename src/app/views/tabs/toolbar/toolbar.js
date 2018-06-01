angular.module('galaxy').directive('toolbar', function () {
    return {
        restrict: 'E',
        controller: ToolbarCtrl,
        controllerAs: 'toolbarCtrl',
        templateUrl: 'tabs/toolbar/toolbar.html',
        replace: true
    }
});

/**
 * Toolbar Controller
 * @constructor
 */
function ToolbarCtrl($scope, galaxyModal) {
    var vm = this;
    var $chromeTabViews = $scope.api.$views.data('chromeTabViews');
    vm.back = function () {
        var view = $chromeTabViews.viewAtIndex($scope.api.$currentTab.index(), true);
        $scope.api.showMainView(view);
        var webview = $chromeTabViews.getWebview(view)[0];
        setTimeout(function () {
            webview.goBack();
        }, 200);
    };
    vm.forward = function () {
        var view = $chromeTabViews.viewAtIndex($scope.api.$currentTab.index(), true);
        $scope.api.showMainView(view);
        var webview = $chromeTabViews.getWebview(view)[0];
        setTimeout(function () {
            webview.goForward();
        }, 200);
    };
    vm.reload = function () {
        var view = $chromeTabViews.viewAtIndex($scope.api.$currentTab.index(), true);
        $scope.api.showMainView(view);
        var webview = $chromeTabViews.getWebview(view)[0];
        setTimeout(function () {
            webview.reload();
        }, 200);
    };
    vm.minusZoom = function () {
        var view = $chromeTabViews.viewAtIndex($scope.api.$currentTab.index(), true);
        $scope.api.showMainView(view);
        var $webview = $chromeTabViews.getWebview(view);
        if($webview.is('webview')){
            setTimeout(() => {
                $webview[0].getWebContents().getZoomFactor((zoom) => {
                    utils.safeApply($scope, function(){
                        zoom = zoom - 0.1;
                        $webview[0].setZoomFactor(zoom);
                        vm.zoom = Math.round(zoom * 100) + '%';
                    });
                });
            }, 200);
        }else{
            var fontSize = parseInt(view.find('.sshTerminal').css('font-size'));
            view.find('.sshTerminal').css('font-size', (fontSize - 1) + "px");
            vm.zoom = (fontSize - 1) + "px";
            window.dispatchEvent(new Event('resize'));
        }
    };
    vm.plusZoom = function () {
        var view = $chromeTabViews.viewAtIndex($scope.api.$currentTab.index(), true);
        $scope.api.showMainView(view);
        var $webview = $chromeTabViews.getWebview(view);
        if($webview.is('webview')){
            setTimeout(() => {
                $webview[0].getWebContents().getZoomFactor((zoom) => {
                    utils.safeApply($scope, function(){
                        zoom = zoom + 0.1;
                        $webview[0].setZoomFactor(zoom);
                        vm.zoom = Math.round(zoom * 100) + '%';
                    });
                });
            }, 200);
        }else{
            var fontSize = parseInt(view.find('.sshTerminal').css('font-size'));
            view.find('.sshTerminal').css('font-size', (fontSize + 1) + "px");
            vm.zoom = (fontSize + 1) + "px";
            window.dispatchEvent(new Event('resize'));
        }
    };

    vm.changeUrl = function(){
        $view = $chromeTabViews.viewAtIndex($scope.api.$currentTab.index(), true);
        var $webview = $chromeTabViews.getWebview($view);
        $webview[0].loadURL(vm.url);
    }


    vm.openDownloads = function(){
        galaxyModal.open({
          templateUrl: 'download/download.html',
          controller: 'DownloadController',
          controllerAs: 'downloadCtrl',
          windowClass: 'fullScreen download'
      }).catch(angular.noop);
    };

    $scope.$on("updateToolbar", (ev, $view, $tab) => {
        if ((!($view instanceof jQuery) || !$view.length) && $tab instanceof jQuery && $tab.length) {
            $view = $chromeTabViews.viewAtIndex($tab.index(), true);
        }
        if (!($view instanceof jQuery) || !$view.length) {
            return;
        }
        var $webview = $chromeTabViews.getWebview($view);
        utils.safeApply($scope, function(){
            if($webview.is('webview')){
                vm.isWebview = true;
                if($webview[0].getWebContents()){
                    vm.url = $webview[0].getURL();
                    $webview[0].getWebContents().getZoomFactor((zoom) => {
                        utils.safeApply($scope, function(){
                            vm.zoom = Math.round(zoom * 100) + "%";
                        })
                    });
                }
            }else {
                let props = $tab.data('props');
                vm.isWebview = false;
                vm.url = `${utils.getInstanceName(props.__server)}@${utils.getRemoteAddr(props.__server)}`;
                vm.zoom = $view.find('.sshTerminal').css('font-size');
            }
        })

    });
}