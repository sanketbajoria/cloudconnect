var AWS = require('./aws');
var utils = require('../utils/utils.js');

class CloudInstance{
    constructor(type, instance){
        this.__type = type
        this.__instance = instance;
    }

    getName(){
        if(utils.isAWSType(this.__type)){
            return AWS.getName(this.__instance);
        }
    }

    getAddress(){
        if(utils.isAWSType(this.__type)){
            return AWS.getHostName(this.__instance);
        }
    }

    getUniqueId(){
        if(utils.isAWSType(this.__type)){
            return AWS.getUniqueId(this.__instance);
        }
    }

}

module.exports = CloudInstance;