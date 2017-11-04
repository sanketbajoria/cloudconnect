
const {clipboard}  = require('electron');

function copySelection() {
    if (term.hasSelection()) {
        term.copiedText = term.getSelection();
        clipboard.writeText(term.getSelection());
        console.log(clipboard.readText());
        
    }
}

function pasteInTerminal() {
    clipboard.writeText(term.getSelection());    
}
module.exports = function($terminal, devTunnel){
    var term = new Terminal({
        cursorBlink: true
    });
    
    Terminal.prototype.copySelection = function (ev) {
        if (term.hasSelection()) { //only if u have seleted text in terminal otherwise bubble the event to parent element 
            term.copiedText = term.getSelection();
            clipboard.writeText(term.getSelection());
            term.clearSelection();
            ev.stopPropagation();
            return false; // Stop default behaviour of Ctrl + C or mouse event.
        }
    }
    
    Terminal.prototype.pasteInTerminal = function (ev) {
            ev.stopPropagation();
            term.handler(clipboard.readText());
            term.textarea.value = '';
            term.emit('paste', clipboard.readText());
            term.cancel(ev);
        
    }
    term.attachCustomKeyEventHandler(function (e) {
        if (e.type === 'keydown' && e.ctrlKey && e.key === 'c') {
            return this.copySelection(e);              
        }
        if (e.type === 'keydown' && e.ctrlKey && e.key === 'v') {
            this.pasteInTerminal(e);
            return false;
        }
    });
   
    
    term.open($terminal[0], {
        focus: true
    });
    $terminal.data('terminal', term);
    //term.writeln("Welcome to SSH Tunnel");
    setTimeout(function(){
        term.fit();
        term.element.addEventListener('mousedown', function (ev){
            
                    if(ev.which == 3)
                    {
                          term.pasteInTerminal(ev);
                          console.log("sjdsjds");
                          return false;
                    }
                });
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
