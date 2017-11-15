var loki = require('lokijs');
var Q = require('q');
var clone = require('clone');
const defaultDBPath = "database/galaxy.default";

/**
 * Class representing Database connection
 * @param {*} config 
 */
function DB(path) {
    //Main Database for storing profile and instances
    path = path || defaultDBPath;
    var db = new loki(path, {
        autoload: true,
        autoloadCallback: databaseInitialize,
        autosave: true,
        autosaveInterval: 4000
    }),
    defer = Q.defer();

    function databaseInitialize() {
        defer.resolve(db);
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
        return {
            //profile api
            addProfile: function (profile) {
                return profiles.insert(profile);
            },
            updateProfile: function (profile) {
                return profiles.update(profile);
            },
            removeProfile: function (profile) {
                this.findInstances({ profile: profile.$loki }).forEach((instance) => {
                    this.removeInstance(instance);
                });
                return profiles.remove(profile);
            },
            getProfile: function (id) {
                return clone(profiles.get(id));
            },
            findProfiles: function (query) {
                query = query || {};
                return clone(profiles.find(query));
            },

            //instances api
            addInstance: function (instance, profile) {
                instance.profile = profile.$loki;
                return instances.insert(instance);
            },
            updateInstance: function (instance, profile) {
                instance.profile = profile.$loki;
                return instances.update(instance);
            },
            removeInstance: function (instance) {
                return instances.remove(instance);
            },
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