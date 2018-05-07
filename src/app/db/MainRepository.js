var loki = require('lokijs');
var cryptedFileAdapter = require('../../node_modules/lokijs/src/loki-crypted-file-adapter'); 
var Q = require('q');
var clone = require('clone');
var saveDB = require('../utils/utils').saveDB;

/**
 * Class representing Database connection
 * @param {*} config 
 */
function DB(path, password, newWorkspace) {
    //Main Database for storing profile and instances
    cryptedFileAdapter.setSecret(password);
    var db = new loki(path, {
        autoload: true,
        autoloadCallback: databaseInitialize,
        //autosave: true,
        //autosaveInterval: 4000,
        adapter: cryptedFileAdapter
    }),
    defer = Q.defer();

    function databaseInitialize(err) {
        if(!newWorkspace && err && err instanceof Error){
            defer.reject(err);
        }else{
            defer.resolve(db);
        }
    }

    //When databases get initialized
    return defer.promise.then(function (res) {
        var profiles = db.getCollection("profiles");
        if (profiles === null) {
            profiles = db.addCollection("profiles", { unique: ['name'] });
        }
        var instances = db.getCollection("instances");
        if (instances === null) {
            instances = db.addCollection("instances");
        }
        db.saveDatabase();
        return {
            //profile api
            addProfile: saveDB(db, function (profile) {
                return profiles.insert(profile);
            }),
            updateProfile: saveDB(db, function (profile) {
                return profiles.update(profile);
            }),
            removeProfile: saveDB(db, function (profile) {
                this.findInstances({ profile: profile.$loki }).forEach((instance) => {
                    this.removeInstance(instance);
                });
                profiles.remove(profile);
            }),
            getProfile: function (id) {
                return clone(profiles.get(id));
            },
            findProfiles: function (query) {
                query = query || {};
                return clone(profiles.find(query));
            },

            //instances api
            addInstance: saveDB(db, function (instance, profile) {
                instance.profile = profile.$loki;
                return instances.insert(instance);
            }),
            updateInstance: saveDB(db, function (instance, profile) {
                instance.profile = profile.$loki;
                return instances.update(instance);
            }),
            removeInstance: saveDB(db, function (instance) {
                instances.remove(instance);
            }),
            getInstance: function (id) {
                return clone(instances.get(id));
            },
            findInstances: function (query, profile) {
                query = query || {};
                if (profile) {
                    query.profile = profile.$loki;
                }
                return clone(instances.find(query));
            },
            getPath: function(){
                return path;
            }
        };
    });
}

module.exports = DB;