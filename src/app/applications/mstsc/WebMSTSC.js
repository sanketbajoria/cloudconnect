var koaStatic = require('koa-static');
var path = require('path');
var rdp = require('./rdp');
var utils = require('../../utils/utils');

class WebMSTSC {
    constructor(instance, app) {
      var koaApp = (require('koa'))();
      koaApp.use(koaStatic(path.join(__dirname, '../../views/tabs/mstsc')));
      koaApp.use(koaStatic(path.join(__dirname, '../../../node_modules/')));
      koaApp.use(koaStatic(path.join(__dirname, '../../icons/')));
      this.server = require('http').createServer(koaApp.callback());
      this.connect = {ip: utils.getHost(instance, app), port: utils.getPort(instance, app)};
      this.socketio = require('socket.io');
      this.io = this.socketio.listen(this.server, {
        log: false
      });
      this.io.on('connection', (s) => {
        rdp(s, app.config.mstsc, this.connect);
      });
    }
    open(all) {
      return new Promise((resolve, reject) => {
        if(all){
          this.server.listen(0, () => {
            this.port = this.server.address().port;
            console.log(this.port);
            resolve(this.port);
          });
        }else{
          this.server.listen(0, "localhost", () => {
            this.port = this.server.address().port;
            console.log(this.port);
            resolve(this.port);
          });
        }
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
  
  module.exports = WebMSTSC;