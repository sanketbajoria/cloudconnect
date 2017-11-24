var db = require('../db');
var AWS = require('./aws');
var utils = require('../utils/utils');
var CloudInstance = require('./CloudInstance');
var Q = require('q');
const interval = 5 * 60 * 1000;

/**
 * Abstract the cloud infrastructure such as AWS, Google, Azure etc.. and provide caching functionality
 */
class Cloud {
    /**
     * Start automatic syncing of cloud profile, to update latest cloud instance state
     */
    startAutomaticSync(mainDB) {
        this.stopAutomaticSync();
        db.getCloudRepository().findCloudProfile().forEach((p) => {
            var profile = mainDB.getProfile(p.profileId);
            if(profile){
                this.syncAndFetchCloudProfile(profile, true);
            }
        });
        this.$interval = setInterval(() => {
            db.getCloudRepository().findCloudProfile().forEach((p) => {
                var profile = mainDB.getProfile(p.profileId);
                if(profile){
                    this.syncAndFetchCloudProfile(profile, true);
                }
            });
        }, interval)
    }

    /**
     * Stop automatic syncing
     */
    stopAutomaticSync() {
        if (this.$interval) {
            clearInterval(this.$interval);
        }
    }

    /**
     * Syncing a particular cloud profile, to update latest cloud instance state
     * @param {*} profile 
     * @param {boolean} forceReload
     */
    syncAndFetchCloudProfile(profile, forceReload) {
        if(!forceReload){
            var ret = this.getCloudInstances(profile);
            if(ret && ret.length>0){
                return Q.when(ret);
            }
        }
        if (utils.isAWSType(profile)) {
            return new AWS(profile.aws).getInstances().then((awsInstances) => {
                var cloudInstances = awsInstances.map((a) => new CloudInstance(profile.type, a));
                this.updateCloudProfile(profile, cloudInstances);
                return cloudInstances;
            });
        }
    }

    /**
     * Update the Cloud Instances for a particular Cloud Profile
     * @param {*} profile 
     * @param {*} cloudInstances 
     */
    updateCloudProfile(profile, cloudInstances) {
        var profileId = profile;
        if (!utils.isString(profile)) {
            profileId = db.getUniqueId(profile);
        }
        db.getCloudRepository().updateCloudProfile(profileId, cloudInstances);
    }

    /**
     * Get all cloud instances from a cloud profile
     * @param {*} profile 
     */
    getCloudInstances(profile) {
        var profileId = profile;
        if (!utils.isString(profile)) {
            profileId = db.getUniqueId(profile);
        }
        var cloudProfile = db.getCloudRepository().getCloudProfile(profileId);
        if(cloudProfile && cloudProfile.instances){
            return cloudProfile.instances;
        }
        return [];
        
    }

    /**
     * Get cloud instances from a cloud profile, matching the unique cloud instance id
     * @param {*} profile 
     * @param {*} cloudInstanceName
     * @param {*} cloudInstanceId
     */
    getCloudInstancesBasedOnInstanceId(profile, cloudInstanceName, cloudInstanceId) {
        var cloudInstances = this.getCloudInstances(profile);
        return cloudInstances.filter(function (i) {
            if (utils.isAWSType(profile)) {
                return i.getName() == cloudInstanceName && (!cloudInstanceId || i.getUniqueId() == cloudInstanceId);
            }
        });
    }




















    


    /**
     * Get address of cloud instance
     * @param {*} s 
     */
    /* getCloudInstanceAddress(s) {
        if (utils.isAWSType(s)) {
            var cloudInstance = this.getCloudInstance(s.profileId, s.cloudInstanceId, s.type);
            if (cloudInstance) {
                return AWS.getHostName(cloudInstance);
            }
        }
    } */

    /**
     * Get name of cloud instance
     * @param {*} s 
     */
    /* getCloudInstanceName(s) {
        if (utils.isAWSType(s)) {
            var cloudInstance = this.getCloudInstance(s.profileId, s.cloudInstanceId, s.type);
            if (cloudInstance) {
                return AWS.getName(cloudInstance);
            }
        }
    } */

    /**
     * Get the Cloud Instance Label
     * @param {*} s 
     */
    /* getCloudInstanceLabel(s){
        if(utils.isAWSType(s)){
            return `${AWS.getName(s)} (${AWS.getUniqueId(s)})`;
        }
    } */
}

module.exports = new Cloud();