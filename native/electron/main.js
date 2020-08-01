const { app, Tray, Menu, BrowserWindow, nativeImage } = require('electron');
const path = require('path');

const DataURI = require('datauri');

DataURI(path.join(__dirname, "icon.png"))
  .then(path => {
    global.fuck = nativeImage.createFromDataURL(path);
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
    __dirname,
    'dev',             // npm scripts, means: npm run dev:electron-main
    path.join(__dirname, './'),      // cwd
    2000,                            // debounce delay
  );
}
app.on('ready', async function(){
  win = new BrowserWindow({show: false});

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
    // {
    //   label: 'Item2',
    //   submenu: [
    //     { label: 'submenu1' },
    //     { label: 'submenu2' }
    //   ]
    // },
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
    // {
    //   label: 'Whatever the fuck',
    //   accelerator: 'Alt+Command+I',
    //   click: function() {
    //     win.show();
    //     win.toggleDevTools();
    //   }
    // },
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
    },
    {
      label: 'Preferences...',
      type: 'normal'
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
});
