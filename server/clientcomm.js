const log = require('electron-log')

var clientConn = require('express')();
var clientIOServer = require('http').createServer(clientConn);
var io = require('socket.io')(clientIOServer);
var port = 80;

log.info("Starting socket.io.")

clientIOServer.listen(port, function () {
  log.info('Socket.io listening at port ' + port + '.');
});