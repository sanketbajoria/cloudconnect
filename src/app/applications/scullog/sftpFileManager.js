var Q = require('q'),
  shell = require('./shellParser'),
  path = require('path').posix,
  ShellFileManager = require('./shellFileManager'),
  SFTP = require('ssh2-promise').SFTP,
  Queue = require('../../utils/queue'),
  queue = new Queue(3, Infinity);
  
class SFTPFileManager extends ShellFileManager{
  constructor(scullog, tunnel, app) {
    super(scullog);
    this.app = app;
    this.tunnel = tunnel;
    this.sftp = new SFTP(this.tunnel);
  }

  __exec(action) {
    return this.execCmd(shell[action].cmd.apply(shell[action], Array.prototype.slice.call(arguments, 1)))
      .then((data) => {
        return (shell[action].parser || shell.statusParser)(data);
      }, (err) => {
        return Q.reject(new Error(err.toString()));
      })
  }

  * getStats(p) {
      return yield this.sftp.getStat(p).then((s) => {
        return {
          folder: s.isDirectory(),
          size: s.size
        }
      });
  };

  * list(p) {
    return yield this.sftp.readdir(p).then((data) => {
      return data.map((d) => {
        return {
          name: d.filename,
          mime: mime.lookup(d.filename),
          folder: d.attrs.isDirectory(),
          size: d.attrs.isDirectory()?0:d.attrs.size,
          mtime: d.attrs.mtime*1000 
        }
      });
    });
  };

  exists(p) {
    return this.__exec('exists', p);
  }

  * remove(p) {
    yield this.sftp.unlink(p);
  };

  unlink(p) {
    return this.sftp.unlink(p);
  };

  * mkdirs(dirPath) {
    yield this.sftp.mkdirs(dirPath);
  };

  * copy(src, dest) {
    return yield this.__exec('copy', src, dest);
  };

  * rename(src, dest) {
    return yield this.sftp.rename(src, dest);
  };

  * move(srcs, dest) {
    for (var i = 0; i < srcs.length; ++i) {
      var basename = path.basename(srcs[i]);
      yield this.sftp.rename(srcs[i], path.join(dest, basename));
    }
  }
  
  * writeFile(p, content) {
    return yield this.sftp.writeFile(p, content);
  }

  createReadStream() {
    var params = arguments;
    return this.sftp.createReadStream(params[0]);
  }

  createWriteStream() {
    var params = arguments;
    return this.sftp.createWriteStream(params[0], params[1]);
  }

  __normalizeParams(params){
    return new Q.Promise((resolve, reject)=>{
      params = [...params];
      if(this.app.config.sudo){
        var cmd = params[0] + (Array.isArray(params[1]) ? (" " + params[1].join(" ")) : "");
        if(this.app.config.secret.password){  
          params[0] = `echo "${this.app.config.secret.password}" | sudo -S bash -c 'echo "\n";${cmd}' | awk '{if(NR>1)print}'`;
        }else{
          params[0] = `sudo bash -c '${cmd}'`;
        }
        params[1] = undefined;
        params[2] = Object.assign(params[2] || {}, {pty: true}); //sudo su can prompt for password which require pty;
      }
      resolve(params);
    })
  }

  execCmd(){
    return this.__normalizeParams(arguments).then(params => {
      var promise = queue.add(() => {
        return this.tunnel.exec.apply(this.tunnel, params);
      });
      return promise.then((data) => {
        queue.remove(promise);
        return data;
      });
    })
  }

  spawnCmd(){
    return this.__normalizeParams(arguments).then(params => {
      params[2] = Object.assign(params[2] || {}, {pty: true}); //forced pty for tail cmd
      var promise = queue.add(() => {
        return this.tunnel.spawn.apply(this.tunnel, params);
      });
  
      return promise.then((stream) => {
        stream.on('close', () => {
          queue.remove(promise);
        }).on('finish', () => {
          queue.remove(promise);
        });
        return stream;
      })
    });
  }

  zipFolder(p) {
    var tempZipPath = `/tmp/${new Date().getTime()}-${path.basename(p)}.zip`;
    return this.__exec('zipFolder', p, tempZipPath).then(function(){
      return tempZipPath;
    })
  }

  getPath(){
    return path;
  }

}

module.exports = ShellFileManager