var ShellFileManager = require('./shellFileManager');
cp  = require('child_process');
var Q = require('q');
var dcp = require('duplex-child-process');
var stream = require('stream');

class LocalDockerFileManager extends ShellFileManager {

constructor(options) {
    super();
}

/**
 * Spawn a command
 */
spawnCmd(cmd, params, pty) {
    cmd += (Array.isArray(params)?(" " + params.join(" ")):"");
    //cmd = `docker exec -it qbo-web /bin/sh -c '${cmd}'`;
    return Q.Promise((resolve, reject) => {
        var c = cp.spawn("docker", ["exec", "-i", "qbo-web", "/bin/sh", "-c", cmd]);
        //var c = cp.spawn(cmd , { stdio: ['pipe', 'pipe', process.stderr] });
        //var d = new stream.Duplex();
        //c.stdin.pipe(d, {end: false});
        //c.stdout.pipe(d, {end: false});
        resolve(c);
    })
}

/**
 * Exec a command
 */
execCmd(cmd, params, pty) {
    cmd += (Array.isArray(params)?(" " + params.join(" ")):"");
    cmd = `docker exec qbo-web /bin/sh -c '${cmd}'`;        
    return Q.Promise((resolve, reject) => {
        cp.exec(cmd, (error, stdout, stderr) => {
            if (error)
                return reject(err);
            resolve(stdout);
        })
    })
}

}
module.exports = BashTunnel;
