'use strict'

var app = angular.module('cloudconnect');

app.factory('ConnectionView', function () {
    return {
        getSSHConnectionStatus: function (ssh, cb) {
            ssh.on("ssh", function () {
                var sshConnectionStatus = [];
                var uniqueId = arguments[1].config.uniqueId;
                var name = arguments[1].config.name;
                var con = sshConnectionStatus.filter(s => s.uniqueId == uniqueId && !s.tunnel)[0];
                if (!con) {
                    con = { uniqueId: uniqueId, icon: "fa-spinner fa-spin fa-fw", class: "connecting", message: "Connecting " + name };
                    sshConnectionStatus.push(con);
                }
                if (arguments[0] == 'connect') {
                    con.icon = "fa-check-circle";
                    con.class = "connected";
                    con.message = "Connected " + name;
                } else if (arguments[0] == 'disconnect') {
                    con.icon = "fa-times-circle";
                    con.class = "disconnected";
                    con.message = "Disconnected " + name + (arguments[2] && arguments[2].err ? (" " + arguments[2].err.message) : "");
                }
                if (cb) {
                    cb(arguments, true);
                }
            })
                .on("tunnel", function () {
                    var cfg = arguments[2].tunnelConfig;
                    var prefix = "Forward"
                    if (cfg.name == "__socksServer") {
                        prefix = "Reverse"
                    }
                    var con = sshConnectionStatus.filter(s => s.uniqueId == cfg.name && s.tunnel)[0];
                    if (!con) {
                        con = { uniqueId: cfg.name, icon: "fa-spinner fa-spin fa-fw", class: "connecting", message: `Establishing ${prefix} tunnel at ${cfg.localPort} port` };
                        sshConnectionStatus.push(con);
                    }
                    if (arguments[0] == 'connect') {
                        con.icon = "fa-check-circle";
                        con.class = "connected";
                        con.message = `Established ${prefix} tunnel at ${cfg.localPort} port`;
                    } else if (arguments[0] == 'disconnect') {
                        con.icon = "fa-times-circle";
                        con.class = "disconnected";
                        con.message = `Disconnected ${prefix} tunnel at ${cfg.localPort} port`;
                    }
                    if (cb) {
                        cb(arguments, false);
                    }
                });
            return sshConnectionStatus;
        }
    }
})