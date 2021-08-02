const { app, Tray, Menu, BrowserWindow, nativeImage, screen } = require('electron');

global.screen = screen;
const path = require('path');

const DataURI = require('datauri');

// Wait, what was this intended to do?
DataURI(path.join(__dirname, "icon.png"))
  .then(path => {
    global.wat = nativeImage.createFromDataURL(path);
  });

const j = fn => path.join(__dirname, 'icons', fn + '.png');
const icons = `
  icon-clock-enabled
  icon-clock-disabled
  start-long-break
  start-turnip
  start-short-break
  status-long-break
  status-turnip
  status-turnip-stopped
  status-short-break
  stop-enabled
  stop-disabled
  vitarka-logo
`.split('\n')
 .map(n => n.trim())
 .reduce((a, n) => Object.assign(a, { [n.replace(/-/g,'_')]: j(n) }), {});


const trayIconPath = path.join(__dirname, 'icons/vitarka-logo.png');

// const iconPath = path.join(__dirname, 'svg', 'tomighty-logo.svg')
let appIcon = null;
let win = null;

if (process.env.NODE_ENV === 'development') {
  require('electron-watch')(
    __dirname + '/*.js',             // ignore non-js changes
    'dev',                           // npm scripts, means: npm run dev:electron-main
    path.join(__dirname, './'),      // cwd
    2000,                            // debounce delay
  );
}
global.app = app;
app.on('ready', onAppReady);

// Kludgy, but allows window to stay open, yet
// correctly detects when intention is to close app.
let _ranBeforeQuit = false;
app.on('before-quit', e => {
  _ranBeforeQuit = true;
});

function resizeAndCenter(win, widthHeight, _screen = screen) {
  const [winWidth, winHeight] = widthHeight || win.getSize();
  const { width: screenWidth, height: screenHeight } = _screen.getPrimaryDisplay().workAreaSize;
  win.setBounds({
    x: Math.round((screenWidth-winWidth)/2),
    y: Math.round((screenHeight-winHeight)/2),
    width: winWidth,
    height: winHeight,
  });
}

// Maybe load these with dialog.about() and dialog.options() and
// make a simple function that they both use:
function loadAbout(win = global.win) {
  win.loadFile('about.html').then(_ => {
    win.visibleOnAllWorkspaces = true;
    win.title = 'About Vitarka';
    resizeAndCenter(win, [280, 330]);
    win.show();
  });
}

function loadConfig(win = global.win) {
  win.loadFile('config.html').then(_ => {
    win.visibleOnAllWorkspaces = true;
    win.title = 'Vitarka Preferences';
    resizeAndCenter(win, [394, 276]);
    win.show();
  });
}

global.rc = resizeAndCenter;
global.la = loadAbout;

async function onAppReady() {
  win = global.win = new BrowserWindow({show: false, visibleOnAllWorkspaces: true });

  win.on('close', e => {
    if (!_ranBeforeQuit) {
      e.preventDefault();
      win.hide();
    } else {
      console.log('quitting for real tho');
    }
  });

  appIcon = new Tray(icons.status_turnip_stopped);
  appIcon.setTitle(' Stopped')

  var contextMenu = Menu.buildFromTemplate([
    {
      label: '09:02',
      type: 'normal',
      icon: icons.icon_clock_disabled,
      enabled: false,
    },
    {
      label: 'Stop',
      type: 'normal',
      icon: icons.stop_enabled,
    },
    {
      type: 'separator',
    },
    {
      label: 'No pomodoros',
      type: 'normal',
      enabled: false,
    },
    {
      label: 'Reset count',
      type: 'normal',
      enabled: false,
    },
    {
      type: 'separator',
    },
    {
      label: 'Turnip',
      type: 'radio',
      icon: icons.start_turnip,
    },
    {
      label: 'Short break',
      type: 'radio',
      icon: icons.start_short_break,
    },
    {
      label: 'Long break',
      type: 'radio',
      icon: icons.start_long_break,
    },
    {
      type: 'separator',
    },
    {
      label: 'About Vitarka',
      type: 'normal',
      click: () => loadAbout(),
    },
    {
      label: 'Preferences...',
      type: 'normal',
      click: () => loadConfig(),
    },
    {
      type: 'separator',
    },
    { label: 'Quit',
      accelerator: 'Command+Q',
      selector: 'terminate:',
    }
  ]);
  appIcon.setToolTip('This is my application.');
  appIcon.setContextMenu(contextMenu);
}
