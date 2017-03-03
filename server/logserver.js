const log = require('electron-log');
const ws = require("nodejs-websocket");
const os = require('os');
const port = 9999;

var logLevels = [
  "Info",
  "Debug",
  "Warn",
  "Error"
];

var sessions = [];

// gather ip addresses
var interfaces = os.networkInterfaces();
var ipAddresses = [];
for (var prop in interfaces) {
  if (interfaces.hasOwnProperty(prop)) {
    interfaces[prop].forEach(function (iface) {
      if ('IPv4' !== iface.family) {
        // skip over non-ipv4 addresses
        return;
      }

      ipAddresses.push(iface.address + ":" + port);
    });
  }
}

function onConnect(clientComm) {
  return function(conn) {
    log.debug("Connected to log client.");

    // save session
    var timestamp = Date.now();
    var session = {
      start : timestamp,
      messages : []
    };
    sessions.push(session);

    // listen for text
    var messageRegex = new RegExp(/^\{(\w*)\}:(.*)$/);
    conn.on("text", function (message) {
        var match = messageRegex.exec(message);
        if (match) {
          var type = match[1];
          var message = match[2];
          if (type == "Identify") {
            session.name = message;
          }
          else if (-1 != logLevels.indexOf(type)) {
            var packet = {
              timestamp: Date.now(),
              level: type,
              message: message
            };
            session.messages.push(packet);

            clientComm.forward('log', packet);
          }
        }
    });

    conn.on("close", function (code, reason) {
        log.debug("Connection closed");
        sessions.remove(conn);
    });
  };
}

module.exports = function(clientComm) {
  log.debug("Starting WebSocket server.");

  // give info to clientComm
  clientComm.setInfo(
  {
    status:0,
    ips:ipAddresses
  });

  var server = ws
    .createServer(onConnect(clientComm))
    .listen(port);
};