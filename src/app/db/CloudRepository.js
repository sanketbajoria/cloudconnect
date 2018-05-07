var loki = require('lokijs');
var cryptedFileAdapter = require('../../node_modules/lokijs/src/loki-crypted-file-adapter'); 
var Q = require('q');
var CloudInstance = require('../cloud/CloudInstance');
var saveDB = require('../utils/utils').saveDB;


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
function DB(path, password, newWorkspace){
    cryptedFileAdapter.setSecret(password); // you should change 'mySecret' to something supplied by the user
    var cloudDb = new loki(path, {
        autoload: true,
        autoloadCallback: cloudDatabaseInitialize,
        adapter: cryptedFileAdapter
        //autosave: true,
        //autosaveInterval: 10000
    }),
        cloudDefer = Q.defer();
    
    
    function cloudDatabaseInitialize(err) {
        if(!newWorkspace && err && err instanceof Error){
            cloudDefer.reject(err);
        }else{
            cloudDefer.resolve(cloudDb);
        }
    }
    
    return cloudDefer.promise.then(function (res) {
        var cloudProfiles = cloudDb.getCollection("cloudProfiles");
        if (cloudProfiles == null) {
            cloudProfiles = cloudDb.addCollection("cloudProfiles", {
                unique: ['profileId']
            });
        }
        cloudDb.saveDatabase();
        return {
            //cloud instances api
            updateCloudProfile: saveDB(cloudDb, function (profileId, instances) {
                var doc = cloudProfiles.by("profileId", profileId);
                var ret;
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
            }),
            removeCloudProfile: saveDB(cloudDb, function (profileId) {
                var doc = cloudProfiles.by("profileId", profileId);
                return cloudProfiles.remove(doc);
            }),
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
                return path;
            }
        };
    });
}

module.exports = DB;