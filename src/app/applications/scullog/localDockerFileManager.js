var ShellFileManager = require('./shellFileManager'),
    cp = require('child_process'),
    Q = require('q'),
    dcp = require('duplex-child-process'),
    stream = require('stream');

class LocalDockerFileManager extends ShellFileManager {

    constructor(scullog, tunnel, app) {
        super(scullog, tunnel, app);
    }

    execCmd() {
        return this.tunnel.exec.apply(this.tunnel, [...arguments].concat(this.app.config.dockerName));
    }

    spawnCmd() {
        return this.tunnel.spawn.apply(this.tunnel, [...arguments].concat(this.app.config.dockerName));
    }

}
module.exports = LocalDockerFileManager;
