var AWS = require('aws-sdk');
AWS.config.loadFromPath(__dirname + '/../aws.json');


var ec2 = new AWS.EC2();

ec2.describeInstances({}, function(err, data){
    console.log(data);
})



