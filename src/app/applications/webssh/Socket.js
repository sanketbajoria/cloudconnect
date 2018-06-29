class Socket {
  constructor(ssh) {
    this.ssh = ssh;
    this.connection = 0;
  }
  open(socket) {
    this.connection++;
    this.ssh.on('disconnect', (err) => {
      socket.emit('ssherror', err.message);
    })
    socket.on('init', (cols, rows, cookieValue) => {
      this.termCols = cols;
      this.termRows = rows;
      /* if(cookieValue != 'value'){
        socket.emit('authenticationError');
        return;
      } */
      this.ssh.shell({
        cols: this.termCols,
        rows: this.termRows,
        term: 'xterm'
      }).then((stream) => {
        socket.on('data', (data) => {
          stream.write(data)
        })
        socket.on('resize', (data) => {
          stream.setWindow(data.rows, data.cols)
        })
        socket.on('disconnecting', (reason) => {
          console.log('SOCKET DISCONNECTING: ' + reason)
        })
        socket.on('disconnect', (reason) => {
          console.log('SOCKET DISCONNECT: ' + reason)
          this.connection--;
        })
        socket.on('error', function socketOnError(err) {
          console.log('SOCKET ERROR - ' + err);
        })


        stream.on('data', (data) => {
          socket.emit('data', data.toString('utf-8'))
        })
        stream.on('close', (code, signal) => {
          var message = ((code || signal) ? (((code) ? 'CODE: ' + code : '') + ((code && signal) ? ' ' : '') + ((signal) ? 'SIGNAL: ' + signal : '')) : undefined);
          socket.emit('ssherror', message);
          socket.disconnect(true)
        })

        stream.stderr.on('data', (data) => {
          console.log('STDERR: ' + data)
        })
      })
    })

  }
}

module.exports = Socket;

