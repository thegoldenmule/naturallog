const {app, BrowserWindow, Menu} = require('electron')
const path = require('path')
const url = require('url')
const log = require('electron-log')

// setup logging
log.transports.file.level = 'silly';
log.transports.file.format = '{h}:{i}:{s}:{ms} {text}';
log.transports.file.maxSize = 5 * 1024 * 1024;
log.transports.file.file = __dirname + '/log.txt';
log.transports.file.streamConfig = { flags: 'w' };

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let clientComm;

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({
    width: 700,
    height: 700,
    minWidth: 700,
    minHeight: 700,
    icon: path.join(__dirname, 'assets/icons/png/64x64.png')
  });

  // and load the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  });

  // setup application menu
  var template = [
    {},
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Dev Tools',
          click: () => {
            win.webContents.openDevTools();
          }
        },
        {
          label: 'Clear',
          click: () => clientComm.forward('filemenu', { type: 'clear'}),
        },
        {
          label: 'Copy',
          click: () => clientComm.forward('filemenu', { type: 'copy'}),
        },
      ],
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
});

// start our server + log-client controller
clientComm = require('./server/log-client-controller.js');
require('./server/log-server.js')(clientComm);
