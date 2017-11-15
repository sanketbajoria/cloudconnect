var Q = require('q');
var MainRepository = require('./MainRepository');
var CloudRepository = require('./CloudRepository');  

class Repository{

    constructor(){
        this.$cloudRepository = new CloudRepository().then((db) => {
            return this.cloudRepository = db;
        });
    }

    $initialize(path){
        this.$mainRepository = new MainRepository(path).then((db) => {
            this.mainRepositoryPath = db.getPath();
            return this.mainRepository = db;
        });
        return Q.all([this.$mainRepository, this.$cloudRepository]).then(() => {
            return this;
        });
    }

    /**
     * Get Main Repositorysitory Path
     */
    getMainRepositoryPath(){
        return this.mainRepositoryPath;
    }

    /**
     * Get current Main Repositorysitory if path not passed, otherwise, intialize a new Main Repositorysitory
     */
    getMainRepository(){
           return this.mainRepository;   
    }

    /**
     * Get a Cloud Repositorysitory
     */
    getCloudRepository(){
        return this.cloudRepository;
    }

    /**
     * Get Unique Id of database object
     */
    getUniqueId(obj){
        return obj && obj.$loki;
    }
}

module.exports = new Repository();
