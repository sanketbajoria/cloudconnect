'use strict';
var fs = require('fs');
(function () {
    function mapFile(file){
        return {
            name: file.name,
            path: file.path,
            content: fs.readFileSync(file.path)
        }
    }
    var app = angular.module('cloudconnect');
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
                            scope.fileRead = [...changeEvent.target.files].map(mapFile);
                        }else{
                            scope.fileRead = [...changeEvent.target.files].map(mapFile)[0];
                        }
                    });
                });
            }
        }
    }]);
})();