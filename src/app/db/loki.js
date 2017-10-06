var loki = require('lokijs'),
    db = new loki('database/galaxy.db', {
        autoload: true,
        autoloadCallback : databaseInitialize,
        autosave: true, 
        autosaveInterval: 4000
    }),
    defer = require('q').defer();

function databaseInitialize() {
    defer.resolve(db);
}

module.exports = defer.promise.then(function(db){
    var profiles = db.getCollection("profiles");
    if (profiles === null) {
      profiles = db.addCollection("profiles", {unique: ['name']});
    }
    var instances = db.getCollection("instances");
    if (instances === null) {
      instances = db.addCollection("instances", {exact: ['name', 'profile']});
    }
    return {
        //profile api
        addProfile: function(profile){
            return profiles.insert(profile);
        },
        updateProfile: function(profile){
            return profiles.update(profile);
        },
        removeProfile: function(profile){
            this.findInstances({profile: profile.$loki}).forEach((instance) => {
                this.removeInstance(instance);
            });
            return profiles.remove(profile);
        },
        getProfile: function(id){
            return profiles.get(id);
        },
        findProfiles: function(query){
            query = query || {};
            return profiles.find(query);
        },

        //instances api
        addInstance: function(instance, profile){
            instance.profile = profile.$loki;
            return instances.insert(instance);
        },
        updateInstance: function(instance, profile){
            instance.profile = profile.$loki;
            return instances.update(instance);
        },
        removeInstance: function(instance){
            return instances.remove(instance);
        },
        getInstance: function(id){
            return instances.get(id);
        },
        findInstances: function(query, profile){
            query = query || {};
            if(profile){
                query.profile = profile.$loki;
            }
            return instances.find(query);
        },

        getUniqueId: function(obj){
            return obj && obj.$loki
        }
    };
});