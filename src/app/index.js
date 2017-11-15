var app = angular.module('galaxy', ['ngRoute', 'ngAnimate', 'ui.bootstrap', 'toastr']).config(function($routeProvider){
    $routeProvider.when('/main', {
        controller: 'MainController',
        controllerAs: 'vm',
        templateUrl: 'main/main.html',
        resolve: { "db": function(){
            return db.$initialize();
            }
        }
    }).otherwise({
        controller: 'IndexController',
        controllerAs: 'vm',
        templateUrl: 'preload.html'
    });
}).run(function($location){
    $(window).resize(function(){
        $('.sshTerminal').each((idx, t) => {
            setTimeout(function(){
                $(t).data('terminal').fit();
            }, 200)
        });
    });
});

app.controller('IndexController', function($location){
    $location.path('/main');
}).directive('onEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.myEnter);
                });

                event.preventDefault();
            }
        });
    };
});