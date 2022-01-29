angular.module('cloudconnect')
    .directive("onEnterPress", function () {
        return function (scope, element, attrs) {
            element.bind("keydown keypress", function (event) {
                if (event.which === 13) {
                    utils.safeApply(scope, function () {
                        scope.$eval(attrs.onEnterPress);
                    });
                    event.preventDefault();
                }
            });
        };
    });

