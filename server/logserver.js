const log = require('electron-log')

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
var ws = require("nodejs-websocket")

var logLevels = [
  "Info",
  "Debug",
  "Warn",
  "Error"
];

log.debug("Starting WebSocket server.")

var server = ws.createServer(function (conn) {
    log.debug("New connection")

    var timestamp = new Date().now();
    var session = new {
      start : timestamp,
      messages : []
    }

    var messageRegex = new RegExp(/^\{(\w*)\}:(.*)$/)
    conn.on("text", function (message) {
        var match = logMessageRegex.exec(message)
        if (match) {
          var type = match[1];
          var message = match[2];
          if (type == "Identify") {
            session.name = message;
          }
          else if (logLevels.contains(type)) {
            var timestamp = new Date().now();

            session.messages.add({
              timestamp: timestamp,
              level: type,
              message: message
            })
          }
        }
    })
    conn.on("close", function (code, reason) {
        log.debug("Connection closed")
    })
}).listen(9999)