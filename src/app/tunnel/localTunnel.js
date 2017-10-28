const EventEmitter = require('events'),
    cp = require('child_process'),
    Q = require('q'),
    dcp = require('duplex-child-process'),
    stream = require('stream');


class LocalTunnel extends EventEmitter {

    constructor(options) {
        super();
    }

    /**
     * Spawn a command
     */
    spawnCmd(cmd, params, pty) {
        var machineName = arguments[arguments.length-1];
        cmd += (Array.isArray(params) ? (" " + params.join(" ")) : "");
        return Q.Promise((resolve, reject) => {
            var c = dcp.spawn("docker", ["exec", "-i", machineName, "/bin/sh", "-c", cmd]);
            resolve(c);
        })
    }

    /**
     * Exec a command
     */
    execCmd(cmd, params, pty) {
        var machineName = arguments[arguments.length-1];
        cmd += (Array.isArray(params) ? (" " + params.join(" ")) : "");
        cmd = `docker exec ${machineName} /bin/sh -c "${cmd}"`;
        return Q.Promise((resolve, reject) => {
            cp.exec(cmd, (error, stdout, stderr) => {
                if (error)
                    return reject(err);
                resolve(stdout);
            })
        })
    }
}

module.exports = LocalTunnel;
