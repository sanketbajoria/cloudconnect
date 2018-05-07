'use strict';
(function () {
    var app = angular.module('galaxy');
    app.directive("uiLoader", function () {
        return {
            restrict: 'E',
            templateUrl: 'loader/loader.html',
            scope: {},
            replace: true
        }
    }).factory("LoaderService", function ($document, $compile, $rootScope) {
        var $loader = null;
        return {
            "start": function () {
                if (!$loader) {
                    $loader = $compile('<ui-loader></ui-loader')($rootScope.$new(true));
                    $('body').append($loader);
                }
            },
            "stop": function () {
                if ($loader) {
                    $loader.remove();
                    $loader = null;
                }
            }
        }
    })
})();