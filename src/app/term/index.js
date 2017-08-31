
module.exports = function($terminal, devTunnel){
    var term = new Terminal({
        cursorBlink: true
    });
    term.open($terminal[0], {
        focus: true
    });
    term.writeln("Welcome to SSH Tunnel");
    setTimeout(function(){
        term.fit();
        devTunnel.getShellSocket({cols: term.cols, rows: term.rows, term: 'xterm'}).then(function(socket){
            socket.on('close', function () {
                console.log('Stream :: close');
            }).on('data', function (data) {
                //console.log('STDOUT: ' + data);
                term.write(data.toString("UTF-8"));
            }).stderr.on('data', function (data) {
                console.log('STDERR: ' + data);
            });
            term.on('data', function(data){
                socket.write(data)
            }).on('close', function(){
                socket.close();
            });
        })
    }, 200)
}
