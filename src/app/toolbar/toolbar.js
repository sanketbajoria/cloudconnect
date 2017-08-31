var app = angular.module('galaxy')
app.directive("floatingToolbar", function(){
    return {
        transclude: true,
        restrict: 'E',
        template: "<div class='floating-toolbar' style='position:absolute' draggable ng-class=open?'':'collapsed' ng-transclude></div>",
        replace: true,
        scope: {
            trigger: '@',
            open: '=?'
        },
        link: function(scope, element, attrs, controllers) {
            $(element).find(".collapsible").toggle(scope.open);
            if(scope.trigger == 'click'){
                $(element).on('click', '.heading', function(){
                    if(!$(element).hasClass("dragging")){
                        scope.$apply(function(){
                            scope.open = !scope.open;
                            $(element).find(".collapsible").toggle(scope.open);
                        })
                    }
                });
            }else if(scope.trigger == 'hover'){
                $(element).hover(function(){
                    scope.$apply(function(){
                        scope.open = !scope.open;
                        $(element).find(".collapsible").toggle(scope.open);
                    });
                })
            }
            
        }
    }
})