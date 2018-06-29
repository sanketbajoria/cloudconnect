var rdp = require('node-rdpjs');

/**
 * Create proxy between rdp layer and socket io
 * @param server {http(s).Server} http server
 */

module.exports = function (client, config, connect) {
  var rdpClient = null;
  client.on('init', function (infos) {
    /* if (infos.cookieValue != 'value') {
      client.emit('authenticationError');
      return;
    } */
    if (rdpClient) {
      // clean older connection
      rdpClient.close();
    };

    rdpClient = rdp.createClient({
      domain: config.domain,
      userName: config.username,
      password: config.password,
      enablePerf: true,
      autoLogin: true,
      screen: infos.screen,
      locale: infos.locale,
      logLevel: process.argv[2] || 'DEBUG'
    }).on('connect', function () {
      client.emit('rdp-connect');
    }).on('bitmap', function (bitmap) {
      client.emit('rdp-bitmap', bitmap);
    }).on('close', function () {
      client.emit('rdp-close');
    }).on('error', function (err) {
      client.emit('rdp-error', err);
    }).connect(connect.ip, connect.port);
  }).on('mouse', function (x, y, button, isPressed) {
    if (!rdpClient) return;

    rdpClient.sendPointerEvent(x, y, button, isPressed);
  }).on('wheel', function (x, y, step, isNegative, isHorizontal) {
    if (!rdpClient) {
      return;
    }
    rdpClient.sendWheelEvent(x, y, step, isNegative, isHorizontal);
  }).on('scancode', function (code, isPressed) {
    if (!rdpClient) return;

    rdpClient.sendKeyEventScancode(code, isPressed);
  }).on('unicode', function (code, isPressed) {
    if (!rdpClient) return;

    rdpClient.sendKeyEventUnicode(code, isPressed);
  }).on('disconnect', function () {
    if (!rdpClient) return;
    rdpClient.close();
  });
}

