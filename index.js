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

// setup application menu
var template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Save',
        accelerator: 'CmdOrCtrl+S',
        click() {

        }
      },
      {
        label: 'Open',
        accelerator: 'CmdOrCtrl+O',
        click() {

        }
      }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      {
        label: 'Clear',
        accelerator: 'CmdOrCtrl+Delete',
        click() {
          log.debug('Clear.');
        }
      },
      {
        label: 'Copy',
        accelerator: 'CmdOrCtrl+Shift+S',
        click() {
          log.debug('Copy.');
        }
      }
    ]
  },
  {
    label: 'View',
    submenu: [
      {
        label: 'Next Tab',
        accelerator: 'CmdOrCtrl+Tab',
        click() {

        }
      },
      {
        label: 'Previous Tab',
        accelerator: 'CmdOrCtrl+Shift+S',
        click() {
          
        }
      },
      {
        label: 'Tabs',
        submenu: [
          {
            label: 'Separate Tabs',
            click() {

            }
          },
          {
            label: 'Aggregate Tabs',
            click() {

            }
          }
        ]
      }
    ]
  }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({
    titleBarStyle: 'hidden',
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

// start our server + log-client controller
var clientComm = require('./server/log-client-controller.js');
var logServer = require('./server/log-server.js')(clientComm);