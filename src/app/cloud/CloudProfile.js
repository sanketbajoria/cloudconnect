var utils = require('../utils/utils.js');

function CloudProfile(t) {
    var C = require("../" + utils.getCloudProfileConfiguration(t).scriptPath);
    return new C();
}

module.exports = CloudProfile;