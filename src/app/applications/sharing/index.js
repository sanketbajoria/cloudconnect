var http = require('http');
var httpProxy = require('http-proxy');
var fs = require('fs');
var path = require('path');
var url = require('url');
var utils = require('../../utils/utils');


var proxy = httpProxy.createProxyServer({});

//{profileId: {name: '', servers:[{serverId: {name: '', applications:{id: }}]}}
function getServers(db, token){
  return Object.keys(token.sharing).reduce((r, pId) => {
    var profile = db.getMainRepository().getProfile(pId);
    if(profile){
      r[pId] = {id: pId, name: profile.name};
      r[pId]["servers"] = Object.keys(token.sharing[pId]).reduce((r, sId) => {
        var server = db.getMainRepository().getInstance(sId);
        if(server){
          r[sId] = {id: sId, name: utils.getInstanceName(server)}
          r[sId]["applications"] = Object.keys(token.sharing[pId][sId]).reduce((r, aId) => {
            var application = utils.getSharingApplications(server.applications).filter(a => a.uniqueId == aId)[0];
            if(application){
              r[aId] = {id: aId, name: utils.getApplicationName(application)};
            }
            return r;
          }, {})
        }
        return r;
      }, {})
    }
    return r
  }, {});
}


function staticServe(uri, req, res){
  var paths = [path.join(__dirname, '../../views/sharingTab/client'), path.join(__dirname, '../../../node_modules/')];
  var found = false;
  if(uri === '/'){
    uri += 'index.html';
  }
  for(var i=0;i<paths.length;i++){
    var filename = path.join(paths[i], uri);
    var exists = fs.existsSync(filename);
    if(exists){
      res.writeHead(200, { 'Content-Type': getContentType(filename) });
      res.write(fs.readFileSync(filename));
      res.end();
      found = true;
    }
  }
  return found;
}


function getContentType(filePath){
  var extname = path.extname(filePath);
    var contentType = 'text/html';
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;      
        case '.jpg':
            contentType = 'image/jpg';
            break;
        case '.wav':
            contentType = 'audio/wav';
            break;
    }
    return contentType;
}

function proxyCall(req, res, serverVal){
  proxy.web(req, res, {
    target: utils.createLocalUrl(serverVal[2])
  });
}

function parseCookies (request) {
  var list = {},
      rc = request.headers.cookie;

  rc && rc.split(';').forEach((cookie) => {
      var parts = cookie.split('=');
      list[parts.shift().trim()] = decodeURI(parts.join('='));
  });
  return list;
}


function setCookie(cname, cvalue, noExpires) {
  var expires = '';
  if(noExpires){
    var d = new Date();
    d.setTime(d.getTime() + (2000 * 24 * 60 *60*1000));
    expires = "expires="+ d.toUTCString() + ";";
  }
  return `${cname}=${cvalue};${expires}HttpOnly`;
}

function deleteCookie(cname) {
  var d = new Date();
  d.setTime(d.getTime() - (7 * 24 * 60 *60*1000));
  var expires = "expires="+ d.toUTCString();
  return cname + "=null" + ";HttpOnly" + expires + ";";
}





class Sharing{
  constructor(db){
    this.db = db;
    this.server = http.createServer((req, res) => {
      var cookies = parseCookies(req);
      var uri = url.parse(req.url).pathname;
      var serverVal = utils.verifyAndExtractServer(this.db, cookies.token, cookies.server);
      if(!serverVal){
        if(req.method === 'POST'){
          let body = '';
          req.on('data', chunk => {
              body += chunk.toString(); // convert Buffer to string
          });
          req.on('end', () => {
            var params = JSON.parse(body);
              if(uri == '/galaxybotToken'){
                var token = params.token;
                var data = utils.verifyAndExtractToken(this.db, token);
                if(token && data){
                  res.setHeader('set-cookie', [setCookie("token", token, true)]);
                  res.write(JSON.stringify(getServers(this.db, data)));
                  res.statusCode = 200;
                }else{
                  res.statusCode = 400;
                }
                res.end();
              }else if(uri == '/galaxybotServers'){
                var t = utils.verifyAndExtractServer(this.db, cookies.token, params.server);
                //start a server and 
                if(params.server && t){
                  var secret =  utils.verifyAndExtractToken(this.db, cookies.token).secret;
                  utils.openShareApp(t[0], t[1], this.db).then((port) => {
                    var server = utils.createJWTToken({server: params.server, p: port}, secret)
                    res.setHeader('set-cookie', [setCookie("server", server)]);
                    res.statusCode = 200;
                    res.end();
                  });
                }else{
                  res.statusCode = 400;
                  res.end();
                }
              }
          });
        }else if(req.method === 'GET'){
          if(!staticServe(uri, req, res)){
            if(uri === '/galaxybotLogout'){
              res.setHeader('set-cookie', [deleteCookie("token"), deleteCookie("server")]);
              res.writeHead(302, {'Location': '/'});
              res.end();
            }else if(uri === '/galaxybotHome'){
              res.setHeader('set-cookie', [deleteCookie("server")]);
              res.writeHead(302, {'Location': '/'});
              res.end();
            }else if(uri === '/galaxybotServers'){
              var data = utils.verifyAndExtractToken(this.db, cookies.token);
              if(data){
                res.write(JSON.stringify(getServers(this.db, data)));
              }else{
                res.setHeader('set-cookie', [deleteCookie("server")]);
                res.write(JSON.stringify({}));
              }
              res.statusCode = 200;
              res.end();
            }
          }
        }   
      }else{
        if(uri === '/galaxybotLogout'){
          res.setHeader('set-cookie', [deleteCookie("token")]);
          res.setHeader('set-cookie', [deleteCookie("server")]);
          res.writeHead(302, {'Location': '/'});
          res.end();
        }else if(uri === '/galaxybotHome'){
          res.setHeader('set-cookie', [deleteCookie("server")]);
          res.writeHead(302, {'Location': '/'});
          res.end();
        }else{
          proxyCall(req, res, serverVal);
        }
      }
    });
    this.server.on('upgrade', (req, socket, head) => {
      var cookies = parseCookies(req);
      var serverVal = utils.verifyAndExtractServer(this.db, cookies.token, cookies.server);
      if(serverVal && serverVal[2]){
        proxy.ws(req, socket, head, {
          target: utils.createLocalUrl(serverVal[2])
        });
      }
    });
  }
  open(port) {
    return new Promise((resolve, reject) => {
      this.server.listen(port, () => {
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
      this.server.close(() => {
        resolve(true);
      });
    })
  }
}

module.exports = Sharing;

