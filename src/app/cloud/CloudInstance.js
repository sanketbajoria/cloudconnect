var CloudProfile = require('./CloudProfile');
class CloudInstance{
    constructor(type, instance){
        this.__type = type
        this.__instance = instance;
        this.cloudProfile = new CloudProfile(type);
    }
    
    getName(){
        return this.cloudProfile.getName(this.__instance);
    }

    getAddress(){
        return this.cloudProfile.getHostName(this.__instance);
    }

    getUniqueId(){
        return this.cloudProfile.getUniqueId(this.__instance);
    }

    isRunning(){
        return this.cloudProfile.isRunning(this.__instance);
    }

    isTerminated(){
        return this.cloudProfile.isTerminated(this.__instance);
    }

    isWindowsPlatform(){
        return this.cloudProfile.isTerminated(this.__instance);
    }
}

module.exports = CloudInstance;