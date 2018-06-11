var Q = require('q');
class AWS {
    constructor(){
        this.aws = require('aws-sdk');
    }

    setConfig(config){
        this.aws.config = new this.aws.Config({
            accessKeyId: config.accessKey, secretAccessKey: config.secretKey, region: config.region
        });
        this.aws.config.setPromisesDependency(Q.Promise);
    }

    getInstances(params) {
        params = params || {};
        return new this.aws.EC2().describeInstances(params).promise().then((data) => {
            return data.Reservations.reduce((p, r) => {
                p = p.concat(r.Instances.filter((i) => {
                    return !this.isTerminated(i);
                }));
                return p;
            }, []);
        });
    }

    dryRun(){
        return this.getInstances({Filters: [], DryRun: true}).catch((err) => {
            if (err.code == "DryRunOperation") {
                return Q.resolve();
            } else {
                return Q.reject(err);
            }
        });
    }

    getHostName(instance){
        return instance.PublicDnsName || instance.PrivateDnsName
    }

    isRunning(instance){
        return instance.State.Code == 16; //running code 16 
    }

    isTerminated(instance){
        return instance.State.Code == 48; //terminated code 16 
    }

    getUniqueId(instance){
        return instance.InstanceId;
    }

    getName(instance){
        var tag = instance.Tags.filter(function(t){
            return t.Key == 'Name';
        });
        return `${(tag.length>0?tag[0].Value:"")}`;
    }

    isWindowsPlatform(instance){
        return instance.Platform == "windows";
    }

}

module.exports = AWS;