class AWS {
    constructor(config){
        this.aws = require('aws-sdk');
        this.aws.config = new this.aws.Config({
            accessKeyId: config.accessKey, secretAccessKey: config.secretKey, region: config.region
        });
        this.aws.config.setPromisesDependency(require('q').Promise);
    }

    getInstances(filters, dryRun, instanceIds, maxResults, nextToken) {
        var params = {
            DryRun: dryRun,
            Filters: filters,
            InstanceIds: instanceIds,
            MaxResults: maxResults,
            NextToken: nextToken
        }
        return new this.aws.EC2().describeInstances(params).promise().then(function (data) {
            return data.Reservations.reduce(function (p, r) {
                p = p.concat(r.Instances);
                return p;
            }, []);
        });
    }

    static getHostName(instance){
        return instance.PublicDnsName || instance.PrivateDnsName
    }

    static getUniqueId(instance){
        return instance.InstanceId;
    }

    static getName(instance){
        var tag = instance.Tags.filter(function(t){
            return t.Key == 'Name';
        });
        return `${(tag.length>0?tag[0].Value:"")}`;
    }

}

module.exports = AWS;