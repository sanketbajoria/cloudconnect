'use strict';
(function () {
    var app = angular.module('galaxy');
    var AWS = require('./cloud/aws.js');
    app.controller('InstanceController', function ($uibModalInstance, $scope, toastr, db, profile, instance, editMode, galaxyModal, $filter) {
        var vm = this, awsInstances;
        var instances = db.findInstances({}, profile);
        vm.db = db;
        vm.utils = utils;
        vm.awsProfiles = db.findProfiles({type: 'aws'});
        vm.config = JSON.parse(require('fs').readFileSync(__dirname + "/config.json", 'utf-8'));
        vm.editMode = editMode;
        vm.instance = instance || {type: profile.type, generic: {}, aws: {}, sshConfig: {}, connection: {type: 'direct'}, applications:[]};
        
        if(profile.type=='aws'){
            vm.instance.aws.profile = vm.awsProfiles.filter(function(p){
                return db.getUniqueId(p) == db.getUniqueId(profile)
            })[0];
            initAWSInstances()
        }

        vm.changeAWSProfile = function(){
            initAWSInstances();
        }

        vm.getInstanceLabel = function(i){
            if(i){
                return `${AWS.getName(i)} (${AWS.getUniqueId(i)})`;
            }
        }

        vm.editApplication = function(app, idx){
            var editMode = !!app;
            galaxyModal.open({
                templateUrl: 'instance/application.html',
                data: {
                    app: app || {config:{secret:{key:'password', pem: {file: "dummy"}}}},
                    applicationTypes: vm.config.instance.application.types,
                    editMode: editMode,
                    hasSSHInstance: vm.hasSSHInstance()
                }
            }).result.then(function(data){
                if(editMode){
                    vm.instance.applications.splice(idx, 1, data.app);
                }else{
                    vm.instance.applications.push(data.app)
                }
            })
        }

        vm.sshInstances = db.findInstances({}, profile).filter(function(i){
            return i.applications.filter(function(a){
                return a.type=='ssh'
            }).length>0
        });
        
        vm.isInvalid = function(){
            return $scope.instance.$invalid || vm.instance.applications.length==0 || (vm.sshInstances.length == 0 && vm.instance.connection.type != 'direct')
        }

        vm.hasSSHInstance = function(){
                return vm.instance.applications.filter(function(a){
                    return a.type=='ssh'
                }).length>0
        }

        
        vm.no = function () {
            $uibModalInstance.dismiss('cancel');
        }
        
        vm.saveInstance = function () {
            try{
                if(vm.editMode){
                    db.updateInstance(vm.instance, profile);
                    toastr.success("Instance saved", "Success");
                    $uibModalInstance.close(vm.instance);
                }else{
                    var isDuplicate;
                    /* if(vm.instance.type == 'generic'){
                        isDuplicate = instances.filter(function(i){
                            if(i.type == 'generic'){
                                return i.generic.name === vm.instance.generic.name;
                            }
                        }).length>0;
                    }else if(vm.instance.type == 'aws'){
                        isDuplicate = instances.filter(function(i){
                            if(i.type == 'aws'){
                                return AWS.getUniqueId(i.aws.instance) === AWS.getUniqueId(vm.instance.aws.instance);
                            }
                        }).length>0;
                    } */
                    if(isDuplicate){
                        throw new Error("Duplicate instance has been found under this profile");
                    }
                    db.addInstance(vm.instance, profile);
                    toastr.success("Instance saved", "Success");
                    $uibModalInstance.close(vm.instance);
                }
            }catch(err){
                toastr.error(err.message, "Error");
            }
        }

        vm.getAWSInstances = function(val, limit){
            return awsInstances.then(function(instances){
                return $filter('limitTo')($filter('filter')(instances, val), limit);
            })
        }


        function initAWSInstances(val, limit){
            awsInstances = new AWS(vm.instance.aws.profile.aws).getInstances();
        }

    })
})();