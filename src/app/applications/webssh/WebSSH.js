var koaStatic = require('koa-static');
var path = require('path');
var Socket = require('./Socket');

class WebSSH {
    constructor(config, sshTunnel) {
      var app = (require('koa'))();
      app.use(function* (next) {
        console.log(this.request.url);
        console.log(this.cookies.get('dummy'));
        yield* next;
      });
      app.use(koaStatic(path.join(__dirname, '../../views/tabs/term/web/')));
      app.use(koaStatic(path.join(__dirname, '../../../node_modules/')));
      app.use(koaStatic(path.join(__dirname, '../../icons/')));
      this.server = require('http').createServer(app.callback());
      this.config = config;
      this.socketio = require('socket.io');
      this.sshTunnel = sshTunnel;
      this.socket = new Socket(sshTunnel);
      this.io = this.socketio.listen(this.server, {
        log: false
      });
      this.io.on('connection', (s) => {
        this.socket.open(s);
      });
    }
    open(ip) {
      return new Promise((resolve, reject) => {
        this.server.listen({port: 0, host: ip}, () => {
          this.port = this.server.address().port;
          resolve(this.port);
        });
        this.server.on('error', (e) => {
          reject(e);
        });
      });
    }
    close() {
      return new Promise((resolve, reject) => {
        this.io.close(() => {
          this.server.close(() => {
            resolve(true);
          })
        });
      })
    }
  }
  
  module.exports = WebSSH;