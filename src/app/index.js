angular.module('galaxy', ['ngRoute', 'ngAnimate', 'ui.bootstrap', 'toastr']).config(function($routeProvider){
    $routeProvider.otherwise({
        controller: 'MainController',
        controllerAs: 'vm',
        templateUrl: 'main/main.html',
        resolve: { "db": function(){
            return db;
        }}
    })
}).run(function(){
    $(window).resize(function(){
        $('.sshTerminal').each((idx, t) => {
            setTimeout(function(){
                $(t).data('terminal').fit();
            }, 200)
        });
    });
})