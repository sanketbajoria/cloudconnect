var Q = require('q'),
  shell = require('./shellParser'),
  path = require('path').posix,
  NodeFileManger = require('scullog').NodeFileManager;
  Queue = require('../utils/queue'),
  queue = new Queue(3, Infinity);
  
class ShellFileManager extends NodeFileManger{
  constructor(tunnel) {
    super();
    this.adminMode = false;
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
    return yield this.__exec('getStats', p).then((isFile) => {
      return { folder: !isFile };
    });
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

/* 
  * writeFile(p, content) {
    return yield this.tunnel.sftp().then((sftp) => {
      var wstream = sftp.createWriteStream.apply(sftp, [p]);
      wstream.end(content);
    })
  }

  createReadStream() {
    var params = arguments;
    return this.tunnel.sftp().then((sftp) => {
      return sftp.createReadStream.apply(sftp, params);
    });
  }

  createWriteStream() {
    var params = arguments;
    return this.tunnel.sftp().then((sftp) => {
      return sftp.createWriteStream.apply(sftp, params);
    });
  } */

  __normalizeParams(params){
    return new Q.Promise((resolve, reject)=>{
      params = [...params];
      if(this.adminMode){
        params[0] = `sudo bash -c '${params[0]}'`;
        params[2] = this.adminMode; //sudo su can prompt for password which require pty;
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
      params[2] = true; //forced pty for tail cmd
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

  /* execCmd(){
    return this.tunnel.execCmd.apply(this.tunnel, this.__normalizeParams(arguments));
  }

  spawnCmd(){
    return this.tunnel.spawnCmd.apply(this.tunnel, this.__normalizeParams(arguments).concat([true]));
  } */

  zipFolder(p) {
    var tempZipPath = `/tmp/${new Date().getTime()}-${path.basename(p)}.zip`;
    return this.__exec('zipFolder', p, tempZipPath).then(function(){
      return tempZipPath;
    })
  }

  filePath(relPath, base) {
    if (relPath.indexOf('..') >= 0) {
      var e = new Error('Do Not Contain .. in relPath!');
      e.status = 400;
      throw e;
    } else if (!!!base || global.C.data.root.indexOf(base) == -1) {
      var e = new Error('Invalid base location');
      e.status = 400;
      throw e;
    } else {
      return path.join(base, relPath);
    }
  }
}

module.exports = ShellFileManager