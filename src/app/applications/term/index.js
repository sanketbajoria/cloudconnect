
const { clipboard } = require('electron');
const SSHUtils = require('ssh2-promise').Utils;

class Term{
    constructor($elem, ssh){
        this.$elem = $elem;
        this.ssh = ssh;
        this.$header = $elem.parent().find('.header');
        this.resizeListener = function(){
            this.term.fit();
            this.term.buffer.y--
            this.term.scroll();
            setTimeout(() => {
                this.term.fit();
                this.term.buffer.y--
                this.term.scroll();
            }, 200)
        }.bind(this);
        this.term = new Terminal({
            cursorBlink: true
        });
        this.term.open(this.$elem[0], {
            focus: true
        });
        this.$elem.data('terminal', this.term);
        this.term.attachCustomKeyEventHandler((e) => {
            if (e.type === 'keydown' && e.ctrlKey && e.key === 'c') {
                return this.copySelection(e);
            }
            if (e.type === 'keydown' && e.ctrlKey && e.key === 'v') {
                //this.pasteInTerminal(e);
                return false;
            }
        });
        this.term.element.addEventListener('mousedown', (ev) => {
            if (ev.which == 3) {
                this.pasteInTerminal(ev);
                return false;
            }
        });
        $(window).resize(this.resizeListener);
    }

    open(){
        setTimeout(() => {
            this.term.fit();
            this.ssh.shell({ cols: this.term.cols, rows: this.term.rows, term: 'xterm' }).then((socket) => {
                this.__socket = socket;
                socket.on('close', () => {
                    console.log('Stream :: close');
                    //close the tab
                }).on('data', (data) => {
                    this.term.write(data.toString("UTF-8"));
                }).stderr.on('data', (data) => {
                    console.log('STDERR: ' + data);
                });
                this.term.removeAllListeners('data');
                this.term.removeAllListeners('close');
                this.term.removeAllListeners('resize');
                this.term.on('data', (data) => {
                    socket.write(data)
                })
                this.term.on('close', () => {
                    SSHUtils.endSocket(socket);
                    socket.close();
                });
                this.term.on('resize', () => {
                    socket.setWindow(this.term.rows, this.term.cols);
                });
                this.term.fit();
                //this.$header.height(this.$header.height() + this.$elem.height() - this.$elem.find(".xterm-viewport").height() - 4);
            });
        }, 200)
    }

    close(){
        SSHUtils.endSocket(this.__socket);   
        this.term.clearCursorBlinkingInterval();
        this.term.removeAllListeners('data');
        this.term.removeAllListeners('close');
        this.term.destroy();
        $(window).off("resize", this.resizeListener);
    }

    

    copySelection(ev) {
        if (this.term.hasSelection()) { //only if u have seleted text in terminal otherwise bubble the event to parent element 
            this.term.copiedText = this.term.getSelection();
            clipboard.writeText(this.term.getSelection());
            this.term.clearSelection();
            ev.stopPropagation();
            return false; // Stop default behaviour of Ctrl + C or mouse event.
        }
    }

    pasteInTerminal(ev) {
        ev.stopPropagation();
        this.term.handler(clipboard.readText());
        this.term.textarea.value = '';
        this.term.emit('paste', clipboard.readText());
        this.term.cancel(ev);
        return false;
    }
}
module.exports = Term
