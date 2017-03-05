/**
 * This file receives logs from clients via websockets.
 */

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

var clients = [];

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

var ids = 0;

function onConnect(logClient) {
  return function(client) {
    log.debug("New client connection.");

    // save session
    var timestamp = Date.now();
    var id = ids++;
    var session = {
      id: id,
      name : "Client_" + id,
      start : timestamp,
      messages : []
    };
    clients.push(session);

    // update log-client
    logClient.forward("addClient", session);

    // listen for text
    var messageRegex = new RegExp(/^\{(\w*)\}:(.*)$/);
    client.on("text", function (message) {
        var match = messageRegex.exec(message);
        if (match) {
          var type = match[1];
          var message = match[2];
          if (type == "Identify") {
            session.name = message;

            // update log-client
            logClient.forward("updateClient", session);
          }
          else if (-1 != logLevels.indexOf(type)) {
            var packet = {
              id: id,
              timestamp: Date.now(),
              level: type,
              content: message
            };
            session.messages.push(packet);

            logClient.forward('log', packet);
          }
          else {
            log.warn("Unknown message received.");
          }
        }
    });

    // listen for the socket to close
    client.on("close", function (code, reason) {
        log.debug("Client connection closed.");
        
        var index = clients.indexOf(session);
        if (-1 != index) {
          clients.splice(index, 1);
        }

        // update log-client
        logClient.forward("removeClient", session);
    });
  };
}

module.exports = function(logClient) {
  log.debug("Starting WebSocket server.");

  // give info to the client
  logClient.setInfo(
  {
    status:0,
    ips:ipAddresses
  });

  var server = ws
    .createServer(onConnect(logClient))
    .listen(port);
};