module.exports = {
    createUrl: function(s){
        if(this.getPort(s)){
            return `${s.protocol}://${this.getHost(s)}:${this.getPort(s)}`; 
        }else{
            return `${s.protocol}://${this.getHost(s)}`; 
        }
    },
    getPort: function(s){
        if(s._tunnel && s.tunnel)
            return s._tunnel.localPort;
        return s.port;
    },
    getHost: function(s){
        if(s.protocol === "file://"){
            return __dirname + "/../" + s.host;
        }else{
            return (s._tunnel && s.tunnel)?"localhost":s.host;
        }
    },
    createCouchUrl: function(s){
        return `${s.protocol}://localhost:${s._couch.port}`; 
    },
    createProxyUrl: function(port){
        return `socks5://localhost:${port}`;
    }
}