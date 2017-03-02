const {app, BrowserWindow} = require('electron')
const path = require('path')
const url = require('url')
const log = require('electron-log')

// setup logging
log.transports.file.level = 'silly';
log.transports.file.format = '{h}:{i}:{s}:{ms} {text}';

// Set maximum log size in bytes. When it exceeds, old log will be saved 
// as log.old.log file 
log.transports.file.maxSize = 5 * 1024 * 1024;

// Write to this file, must be set before first logging 
log.transports.file.file = __dirname + '/log.txt';

// fs.createWriteStream options, must be set before first logging 
log.transports.file.streamConfig = { flags: 'w' };

log.debug("Init.")

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({width: 800, height: 600})

  // and load the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  win.webContents.openDevTools()

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

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