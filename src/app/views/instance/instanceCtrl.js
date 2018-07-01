'use strict';
(function () {
    var app = angular.module('cloudconnect');
    var cloud = require('../cloud');
    app.controller('InstanceController', function ($uibModalInstance, $scope, toastr, profile, instanceId, editMode, galaxyModal, $filter) {
        var vm = this, cloudInstances;
        var instances = db.getMainRepository().findInstances({}, profile);
        vm.db = db;
        vm.utils = utils;
        vm.cloudProfiles = db.getMainRepository().findProfiles({type: 'aws'});
        vm.config = config;
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
                templateUrl: 'application/application.html',
                controller: 'ApplicationController',
                controllerAs: 'applicationCtrl',
                data: {
                    app: angular.copy(app) || {config:{secret:{key:'password', pem: {file: "dummy"}}}},
                    editMode: editMode,
                    instance: vm.instance
                }
            }).result.then(function(data){
                if(editMode){
                    data.app.uniqueId = data.app.uniqueId || (new Date()).getTime();
                    vm.instance.applications.splice(idx, 1, data.app);
                }else{
                    data.app.uniqueId = (new Date()).getTime();
                    vm.instance.applications.push(data.app)
                }
            }).catch(angular.noop);
        }


        vm.testApplication = function(app, idx){
            utils.getSSH(vm.instance, app, db).connect();
        }

        vm.sshInstances = db.getMainRepository().findInstances({}, profile).filter(function(i){
            return i.applications.filter(function(a){
                return a.type=='ssh'
            }).length>0
        });
        
        vm.isInvalid = function(){
            return $scope.instance.$invalid || vm.instance.applications.length==0 || (vm.sshInstances.length == 0 && vm.instance.connection.type != 'direct')
        }

        vm.no = function () {
            $uibModalInstance.dismiss('cancel');
        }

        vm.checkLocalHost = function () {
            if(!utils.isGenericType(vm.instance)){
                vm.instance.cloud.instance = cloud.getCloudInstancesBasedOnInstanceId(db.getMainRepository().getProfile(vm.instance.cloud.profileId), vm.instance.cloud.instanceName)[0];
            }
            utils.isLocalHost(vm.instance).then((isLocalhost) => {
                vm.instance.isLocalhost = isLocalhost;
            });
        }
        
        vm.saveInstance = function () {
            try{
                if(vm.editMode){
                    db.getMainRepository().updateInstance(vm.instance, profile);
                }else{
                    db.getMainRepository().addInstance(vm.instance, profile);
                }
                toastr.success("Instance saved", "Success");
                $uibModalInstance.close(vm.instance);
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