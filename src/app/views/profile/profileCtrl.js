'use strict';
(function () {
    var app = angular.module('galaxy');
    var CloudProfile = require('../cloud/CloudProfile');
    app.controller('ProfileController', function ($uibModalInstance, toastr, profileId, editMode) {
        var vm = this;
        vm.utils = utils;
        vm.profile = profileId ? db.getMainRepository().getProfile(profileId) : { aws: {} };
        vm.editMode = editMode;
        vm.config = config;
        vm.testConnection = function () {
            vm.isTesting = true;
            var cloudProfile = new CloudProfile(vm.profile.type);
            cloudProfile.setConfig(vm.profile[vm.profile.type]);
            cloudProfile.dryRun().then(function () {
                toastr.success("Able to establish connection", "Success");
            }, function (err) {
                toastr.error(err.message, "Error");
            }).finally(function(){
                vm.isTesting = false;
            });
        }
        vm.no = function () {
            $uibModalInstance.dismiss('cancel');
        }
        vm.saveProfile = function () {
            try {
                if (vm.editMode) {
                    db.getMainRepository().updateProfile(vm.profile);
                } else {
                    db.getMainRepository().addProfile(vm.profile);
                }
                toastr.success("Profile saved", "Success");
                $uibModalInstance.close(vm.profile);
            } catch (err) {
                toastr.error(err.message, "Error");
            }
        }
        vm.getPath = function () {
            if(vm.profile.type && vm.config.profile.types[vm.profile.type].viewPath){
                return "../" + vm.config.profile.types[vm.profile.type].viewPath;
            }
        }

    })
})();