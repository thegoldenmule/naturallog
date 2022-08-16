/**
 * This file receives logs from clients via websockets.
 */

const log = require('electron-log');
const ws = require("nodejs-websocket");
const os = require('os');

const port = 9999;
const logLevels = [
  "Info",
  "Debug",
  "Warn",
  "Error"
];

// regex for matching messages from a client
const messageRegex = new RegExp(/^\{(\w*)\}:/);

var ids = 0;
var clients = [];

/**
 * Returns a function that is called when a new client connects to the
 * log-server.
 */
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

    // listen for text events
    client.on("text", function (message) {
        // try to parse the message
        var match = messageRegex.exec(message);
        if (match) {
          var type = match[1];
          var index = message.indexOf(':');
          var message = message.slice(index + 1);

          // handle identity events
          if (type == "Identify") {
            session.name = message;
            logClient.forward("updateClient", session);
          }
          // handle log events
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
          // handle unknown events
          else {
            log.warn("Unknown message received.");
          }
        } else {
          console.log('Does not match message format.');
        }
    });

    // listen for the socket to close
    client.on("close", function (code, reason) {
        var index = clients.indexOf(session);
        if (-1 != index) {
          clients.splice(index, 1);
        }

        logClient.forward("removeClient", session);
    });
  };
}

/**
 * Exports a function that takes the log-client-controller as a parameter.
 *
 * @param      {<type>}  logClient  The log-client-controller.
 */
module.exports = async (logClient) => {
  log.debug("Starting log-server.");

  // gather ip addresses
  var ipAddresses = [];
  var interfaces = os.networkInterfaces();
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

  // give info to the client
  logClient.setInfo(
  {
    status:0,
    ips:ipAddresses
  });

  // start accepting client connections
  ws
    .createServer(onConnect(logClient))
    .listen(port);
};