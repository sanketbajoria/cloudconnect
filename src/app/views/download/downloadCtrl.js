var app = angular.module('galaxy');
var downloadQueue = require('./download/downloadQueue');
const {shell} = require('electron')

app.controller('DownloadController', function ($scope, $uibModalInstance, $interval) {
    var vm = this;
    vm.downloadQueue = downloadQueue;
    vm.utils = utils;
    vm.downloadItems = angular.copy(downloadQueue.getAll().slice().reverse());
    var intervalPromise = $interval(function(){
        vm.downloadItems = angular.copy(downloadQueue.getAll().slice().reverse());
    }, 1500);
    vm.no = function () {
        $uibModalInstance.dismiss('cancel');
    }

    vm.completePercent = function(item){
        return Math.round(parseInt(item.receivedBytes)/parseInt(item.totalBytes)  * 100);
    }

    vm.progressStyle = function(item){
        return {width: vm.completePercent(item) + "%"}
    }

    vm.openDownloadFolder = function(download){
        shell.showItemInFolder(download.savePath);
    }

    $scope.$on('$destroy', function() {
        console.log("destroy interval");
        $interval.cancel(intervalPromise);
    });
});