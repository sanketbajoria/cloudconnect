angular.module('galaxy').directive('zoom', Zoom)
    .directive("updateModelOnEnterPressed", function () {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, elem, attrs, ngModelCtrl) {
                elem.bind("keyup", function (e) {
                    if (e.keyCode === 13) {
                        ngModelCtrl.$commitViewValue();
                    }
                });
            }
        }
    });

/**
 * Zoom Controller
 * @constructor
 */
function ZoomCtrl() {
    var vm = this;
    vm.min = vm.min || 50;
    vm.max = vm.max || 300;
    vm.zoomChange = function (zoom) {
        var z = parseInt(zoom);

        if (isNaN(z) || z < vm.min) {
            z = vm.min;
        }

        if (z > vm.max) {
            z = vm.max;
        }

        vm.zoom = z;
        vm.onChange({ zoom: vm.zoom });
    }

    vm.zoomIn = function () {
        vm.zoomChange(parseInt(vm.zoom) + 10);

    }
    vm.zoomOut = function () {
        vm.zoomChange(parseInt(vm.zoom) - 10);
    }
}


/**
 * Zoom component
 * @constructor
 */
function Zoom() {
    return {
        restrict: 'E',
        templateUrl: 'zoom/zoom.html',
        controller: ZoomCtrl,
        controllerAs: 'zoomCtrl',
        bindToController: {
            "onChange": "&",
            "zoom": "=value",
            "min": "=?",
            "max": "=?"
        },
        replace: true
    };
}




