'use strict';
(function () {
    var app = angular.module('galaxy');
    var AWS = require('./cloud/aws.js');
    app.controller('InstanceController', function ($uibModalInstance, toastr, db, profile, galaxyModal) {
        var vm = this;
        vm.db = db;
        vm.awsProfiles = db.findProfiles({type: 'aws'});
        vm.config = JSON.parse(require('fs').readFileSync(__dirname + "/config.json", 'utf-8'));
        
        vm.instance = {type: profile.type, generic: {}, aws: {}, sshConfig: {}, connection: {type: 'direct'}, applications:[]};
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
                    app: app || {config:{secret:{key:'password'}}},
                    applicationTypes: vm.config.instance.application.types,
                    editMode: editMode
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

        
        vm.no = function () {
            $uibModalInstance.dismiss('cancel');
        }
        vm.saveInstance = function () {
            db.addInstance(vm.instance, profile);
            toastr.success("Instance saved", "Success");
            $uibModalInstance.close(vm.instance);
        }

        function initAWSInstances(){
            return new AWS(vm.instance.aws.profile.aws).getInstances().then(function(data){
                vm.awsInstances = data;
            });
        }

    })
})();