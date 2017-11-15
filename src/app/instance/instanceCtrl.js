'use strict';
(function () {
    var app = angular.module('galaxy');
    var cloud = require('./cloud');
    app.controller('InstanceController', function ($uibModalInstance, $scope, toastr, profile, instanceId, editMode, galaxyModal, $filter) {
        var vm = this, cloudInstances;
        var instances = db.getMainRepository().findInstances({}, profile);
        vm.db = db;
        vm.utils = utils;
        vm.cloudProfiles = db.getMainRepository().findProfiles({type: 'aws'});
        vm.config = JSON.parse(require('fs').readFileSync(__dirname + "/config.json", 'utf-8'));
        vm.editMode = editMode;
        vm.instance = instanceId?db.getMainRepository().getInstance(instanceId):{type: profile.type, generic: {}, cloud: {}, sshConfig: {}, connection: {type: 'direct'}, applications:[]};
        
        if(!utils.isGenericType(profile)){
            vm.instance.cloud.profileId = db.getUniqueId(profile);
            initCloudInstances()
        }

        vm.changeCloudProfile = function(){
            initCloudInstances();
        }

        vm.getCloudInstanceLabel = function(i){
            if(i){
                return cloud.getCloudInstanceLabel(i);
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

        vm.sshInstances = db.getMainRepository().findInstances({}, profile).filter(function(i){
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
                    db.getMainRepository().updateInstance(vm.instance, profile);
                    toastr.success("Instance saved", "Success");
                    $uibModalInstance.close(vm.instance);
                }else{
                    var isDuplicate;
                    /* if(utils.isGenericType(vm.instance)){
                        isDuplicate = instances.filter(function(i){
                            if(utils.isGenericType(i)){
                                return i.generic.name === vm.instance.generic.name;
                            }
                        }).length>0;
                    }else if(utils.isAWSType(vm.instance)){
                        isDuplicate = instances.filter(function(i){
                            if(utils.isAWSType(i)){
                                return AWS.getUniqueId(i.instance) === AWS.getUniqueId(vm.instance.aws.instance);
                            }
                        }).length>0;
                    } */
                    if(isDuplicate){
                        throw new Error("Duplicate instance has been found under this profile");
                    }
                    db.getMainRepository().addInstance(vm.instance, profile);
                    toastr.success("Instance saved", "Success");
                    $uibModalInstance.close(vm.instance);
                }
            }catch(err){
                toastr.error(err.message, "Error");
            }
        }

        vm.getCloudInstancesName = function(val, limit){
           var seen = {};
           return cloudInstances.then(function(instances){
                return $filter('limitTo')($filter('filter')(instances, val)
                    .map((i) => i.getName())
                    .filter((item, pos, ary) => {
                        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
                    }), limit);
            })
        }


        function initCloudInstances(){
            var profile = db.getMainRepository().getProfile(vm.instance.cloud.profileId);
            cloudInstances = cloud.syncAndFetchCloudProfile(profile);
        }

    })
})();