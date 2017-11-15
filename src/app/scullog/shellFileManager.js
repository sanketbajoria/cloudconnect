var Q = require('q'),
  shell = require('./shellParser'),
  path = require('path').posix,
  NodeFileManger = require('scullog').NodeFileManager;
  Queue = require('../utils/queue'),
  queue = new Queue(3, Infinity);
  
class ShellFileManager extends NodeFileManger{
  constructor(scullog, tunnel, app) {
    super(scullog);
    this.app = app;
    this.tunnel = tunnel;
  }

  __exec(action) {
    return this.execCmd(shell[action].cmd.apply(shell[action], Array.prototype.slice.call(arguments, 1)))
      .then((data) => {
        return (shell[action].parser || shell.statusParser)(data);
      })
  }

  getService() {
    return {};
  }

  * getStats(p) {
    return yield this.__exec('getStats', p);
    /* .then((isFile) => {
      return { folder: !isFile };
    }); */
  };

  * list(p) {
    return yield this.__exec('list', p);
  };

  exists(p) {
    return this.__exec('exists', p);
  }

  * remove(p) {
    yield this.__exec('remove', p);
  };

  unlink(p) {
    return this.__exec('remove', p);
  };

  * mkdirs(dirPath) {
    yield this.__exec('mkdirs', dirPath);
  };

  * copy(src, dest) {
    return yield this.__exec('copy', src, dest);
  };

  * rename(src, dest) {
    return yield this.__exec('move', src, dest);
  };

  * move(srcs, dest) {
    for (var i = 0; i < srcs.length; ++i) {
      var basename = path.basename(srcs[i]);
      yield this.__exec('move', srcs[i], path.join(dest, basename));
    }
  }
  
  * writeFile(p, content) {
    return yield this.spawnCmd.apply(this, [shell['writeFile'].cmd(p)]).then((stream) => {
      stream.end(content);
    });
  }

  createReadStream() {
    var params = arguments;
    return this.spawnCmd.apply(this, [shell['readFile'].cmd(params[0])]).then((stream) => {
      return stream;
    });
  }

  createWriteStream() {
    var params = arguments;
    return this.spawnCmd.apply(this, [shell['writeFile'].cmd(params[0], params[1])]).then((stream) => {
      return stream;
    });
  }

  __normalizeParams(params){
    return new Q.Promise((resolve, reject)=>{
      params = [...params];
      if(this.app.config.sudo){
        if(this.app.config.secret.password){  
          params[0] = `echo "${this.app.config.secret.password}" | sudo -S bash -c 'echo "\n";${params[0]}' | awk '{if(NR>1)print}'`;
        }else{
          params[0] = `sudo bash -c '${params[0]}'`;
        }
        params[2] = this.app.config.sudo; //sudo su can prompt for password which require pty;
      }
      resolve(params);
    })
  }

  execCmd(){
    return this.__normalizeParams(arguments).then(params => {
      var promise = queue.add(() => {
        return this.tunnel.execCmd.apply(this.tunnel, params);
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
        return this.tunnel.spawnCmd.apply(this.tunnel, params);
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