var loki = require('lokijs');
var Q = require('q');
var CloudInstance = require('../cloud/CloudInstance');

const defaultCloudDBPath = "database/galaxy.cloudDefault"

function mapToModel(cloudProfiles){
    if(cloudProfiles){
        var temp = cloudProfiles;
        if(!Array.isArray(temp)){
            temp = [temp];
        }
        temp.filter((t) => t.instances && t.instances.length>0)
            .forEach((t) => {
                t.instances = t.instances.map((i) => new CloudInstance(i.__type, i.__instance));        
            });
    }
    return cloudProfiles;
}

//Temporary Database to store cloud based instance information
function DB(){
    var cloudDb = new loki(defaultCloudDBPath, {
        autoload: true,
        autoloadCallback: cloudDatabaseInitialize,
        autosave: true,
        autosaveInterval: 4000
    }),
        cloudDefer = Q.defer();
    
    function cloudDatabaseInitialize() {
        cloudDefer.resolve(cloudDb);
    }
    
    return cloudDefer.promise.then(function (res) {
        var cloudProfiles = cloudDb.getCollection("cloudProfiles");
        if (cloudProfiles == null) {
            cloudProfiles = cloudDb.addCollection("cloudProfiles", {
                unique: ['profileId']
            });
        }
        return {
            //cloud instances api
            updateCloudProfile: function (profileId, instances) {
                var doc = cloudProfiles.by("profileId", profileId);
                if (!doc) {
                    doc = {
                        profileId: profileId,
                        instances: instances
                    }
                    return cloudProfiles.insert(doc)
                } else {
                    doc.instances = instances;
                    return cloudProfiles.update(doc);
                }
            },
            removeCloudProfile: function (profileId) {
                var doc = cloudProfiles.by("profileId", profileId);
                return cloudProfiles.remove(doc);
            },
            getCloudProfile: function (profileId) {
                return mapToModel(cloudProfiles.by("profileId", profileId));
            },
            findCloudProfile: function (query, profile) {
                query = query || {};
                if (profile) {
                    query.profile = profile.$loki;
                }
                return mapToModel(cloudProfiles.find(query));
            },
            getPath: function(){
                return defaultCloudDBPath;
            }
        };
    });
}

module.exports = DB;