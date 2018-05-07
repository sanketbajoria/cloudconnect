var Q = require('q');
var MainRepository = require('./MainRepository');
var CloudRepository = require('./CloudRepository');
var fs = require('fs-extra');
var config = require('../utils/utils.js').getConfiguration();
var path = require('path');
var configPath = config.workspace.path + "/" + config.workspace.config;

class Repository {

    $initialize(workspace, password, newWorkspace) {
        password = password || config.workspace.defaultSecret;
        if(newWorkspace){
            this.createNewWorkspace(workspace);
        }
        this.$cloudRepository = new CloudRepository(this.getCloudWorkspacePath(workspace), password, newWorkspace).then((db) => {
            return this.cloudRepository = db;
        });
        this.$mainRepository = new MainRepository(this.getMainWorkspacePath(workspace), password, newWorkspace).then((db) => {
            this.mainRepositoryPath = db.getPath();
            return this.mainRepository = db;
        });
        return Q.all([this.$mainRepository, this.$cloudRepository]).then(() => {
            return this;
        });
    }

    /**
     * Get current Main Repositorysitory if path not passed, otherwise, intialize a new Main Repositorysitory
     */
    getMainRepository() {
        return this.mainRepository;
    }

    /**
     * Get a Cloud Repositorysitory
     */
    getCloudRepository() {
        return this.cloudRepository;
    }

    /**
     * Get Unique Id of database object
     */
    getUniqueId(obj) {
        return obj && obj.$loki;
    }

    /**
     * Get Base workspace path
     * @param {} workspace 
     */
    getBaseWorkspacePath(workspace){
        var basePath = `${config.workspace.path}/${workspace.name}`
        if(workspace.path){
            basePath = workspace.path;
        }
        return basePath;
    }

    /**
     * Get workspace path
     */
    getMainWorkspacePath(workspace) {
        return `${this.getBaseWorkspacePath(workspace)}/${config.workspace.main}`;
    }

    /**
     * Get workspace path
     */
    getCloudWorkspacePath(workspace) {
        return `${this.getBaseWorkspacePath(workspace)}/${config.workspace.cloud}`;
    }

    /**
     * Create new workspace
     */
    createNewWorkspace(wp){
        wp.path = this.getBaseWorkspacePath(wp);
        var data = this.getWorkspaces();
        if(data.filter(d => d.name == wp.name).length==0){
            data.push(wp);
        }
        fs.writeFileSync(configPath, JSON.stringify(data));
        fs.ensureDirSync(config.workspace.path + "/" + wp.name);
    }

    /**
     * Get all workspaces
     */
    getWorkspaces(){
        try{
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }catch(err){
            //do nothing
        }
        return [];
    }
}

module.exports = new Repository();

