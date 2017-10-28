
module.exports = function($terminal, devTunnel){
    var term = new Terminal({
        cursorBlink: true
    });
    term.open($terminal[0], {
        focus: true
    });
    $terminal.data('terminal', term);
    //term.writeln("Welcome to SSH Tunnel");
    setTimeout(function(){
        term.fit();
        devTunnel.getShellSocket({cols: term.cols, rows: term.rows, term: 'xterm'}).then(function(socket){
            //socket.write("sudo su\n");
            socket.on('close', function () {
                console.log('Stream :: close');
            }).on('data', function (data) {
                //console.log('STDOUT: ' + data);
                term.write(data.toString("UTF-8"));
            }).stderr.on('data', function (data) {
                console.log('STDERR: ' + data);
            });
            term.on('data', function(data){
                //console.log('term: ' + data);
                socket.write(data)
            }).on('close', function(){
                socket.end('\x03');
                socket.signal('INT');
                socket.signal('KILL');
                socket.close();
            });
        })
    }, 200)
}
