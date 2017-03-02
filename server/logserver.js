module.exports = function(clientComm) {

  const log = require('electron-log')
  const ws = require("nodejs-websocket")

  var logLevels = [
    "Info",
    "Debug",
    "Warn",
    "Error"
  ];

  var sessions = []

  log.debug("Starting WebSocket server.")

  var server = ws.createServer(function (conn) {
      log.debug("New connection")

      var timestamp = Date.now();
      var session = {
        start : timestamp,
        messages : []
      };
      sessions.push(session);

      var messageRegex = new RegExp(/^\{(\w*)\}:(.*)$/)
      conn.on("text", function (message) {
          var match = messageRegex.exec(message)
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

              clientComm.onlog(packet);
            }
          }
      })
      conn.on("close", function (code, reason) {
          log.debug("Connection closed")
          sessions.remove(conn);
      })
  }).listen(9999)

};