'use strict';
(function () {
    var app = angular.module('galaxy');
    var AWS = require('../cloud/aws.js');
    app.controller('ProfileController', function ($uibModalInstance, toastr, profileId, editMode) {
        var vm = this;
        vm.utils = utils;
        vm.profile = profileId?db.getMainRepository().getProfile(profileId):{aws:{}};
        vm.editMode = editMode;
        vm.config = config;
        vm.testConnection = function () {
            if (utils.isAWSType(vm.profile)) {
                var aws = new AWS(vm.profile.aws);
                aws.getInstances([], true).catch(function (err) {
                    if (err.code == "DryRunOperation") {
                        toastr.success("Able to establish connection", "Success");
                    } else {
                        toastr.error(err.message, "Error");
                    }
                });
            }

        }
        vm.no = function () {
            $uibModalInstance.dismiss('cancel');
        }
        vm.saveProfile = function () {
            try{
                if(vm.editMode){
                    db.getMainRepository().updateProfile(vm.profile);
                }else{
                    db.getMainRepository().addProfile(vm.profile);
                }
                toastr.success("Profile saved", "Success");
                $uibModalInstance.close(vm.profile);
            }catch(err){
                toastr.error(err.message, "Error");
            }
            
        }

    })
})();