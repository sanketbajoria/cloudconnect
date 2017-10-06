'use strict';
(function () {
    var app = angular.module('galaxy');
    app.directive("fileRead", [function () {
        return {
            scope: {
                fileRead: "=",
                multiple: "@"
            },
            link: function (scope, element, attributes) {
                element.bind("change", function (changeEvent) {
                    scope.$apply(function () {
                        if(scope.multiple === true || scope.multiple === 'true'){
                            scope.fileRead = changeEvent.target.files;
                        }else{
                            scope.fileRead = changeEvent.target.files[0];
                        }
                    });
                });
            }
        }
    }]);
})();