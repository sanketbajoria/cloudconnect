import { app, BrowserWindow } from 'electron';

export const devMenuTemplate = {
  label: 'Development',
  submenu: [{
    label: 'Relaunch',
    accelerator: 'CmdOrCtrl+R',
    click: () => {
      //BrowserWindow.getFocusedWindow().webContents.reloadIgnoringCache();
      app.relaunch({args: process.argv.slice(1).concat(['--relaunch'])});
      app.exit(0);
    },
  },
  {
    label: 'Toggle DevTools',
    accelerator: 'Alt+CmdOrCtrl+I',
    click: () => {
      BrowserWindow.getFocusedWindow().toggleDevTools();
    },
  },
  {
    label: 'Quit',
    accelerator: 'CmdOrCtrl+Q',
    click: () => {
      app.quit();
    },
  }],
};
