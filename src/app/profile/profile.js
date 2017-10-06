'use strict';
(function () {
    var app = angular.module('galaxy');
    var AWS = require('./cloud/aws.js');
    app.controller('ProfileController', function ($uibModalInstance, toastr, db, profile, editMode) {
        var vm = this;
        vm.profile = profile || {aws:{}};
        vm.editMode = editMode;
        vm.config = JSON.parse(require('fs').readFileSync(__dirname + "/config.json", 'utf-8'));
        vm.testConnection = function () {
            if (vm.profile.type == 'aws') {
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
                db.addProfile(vm.profile);
                toastr.success("Profile saved", "Success");
                $uibModalInstance.close(vm.profile);
            }catch(err){
                toastr.error(err.message, "Error");
            }
            
        }

    })
})();