// This is main process of Electron, started as first thing when your
// app starts. This script is running through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import path from 'path';
import url from 'url';
import { app, Menu, ipcMain } from 'electron';
import { devMenuTemplate } from './menu/dev_menu_template';
import { editMenuTemplate } from './menu/edit_menu_template';
import createWindow from './helpers/window';
import fse from 'fs-extra';
// Special module holding environment variables which you declared
// in config/env_xxx.json file.
import env from './env';

const setApplicationMenu = () => {
  const menus = [editMenuTemplate];
  menus.push(devMenuTemplate);
  /* if (env.name !== 'production') {
    
  } */
  Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
};

// Save userData in separate folders for each environment.
// Thanks to this you can use production and development versions of the app
// on same machine like those are two separate apps.
if (env.name !== 'production') {
  const userDataPath = app.getPath('userData');
  app.setPath('userData', `${userDataPath} (${env.name})`);
}

fse.ensureDirSync('database');
function createLoadingScreen() {
  var loadingScreen = createWindow('loading', {
    width: 1000,
    height: 600,
    //transparent: true,
    //frame: false,
    backgroundColor: '#2e353d;',
    show: false
  });

  loadingScreen.maximize();

  loadingScreen.loadURL(url.format({
    pathname: path.join(__dirname, 'loading.html'),
    protocol: 'file:',
    slashes: true,
  }));
  loadingScreen.on('closed', () => loadingScreen = null);
  loadingScreen.webContents.on('did-finish-load', () => {
      loadingScreen.show();
  });
  return loadingScreen;
}

app.on('ready', () => {
  var loadingWindow = createLoadingScreen();
  setApplicationMenu();

  const mainWindow = createWindow('main', {
    width: 1000,
    height: 600,
    //transparent: true,
    //frame: false,
    backgroundColor: '#2e353d;',
    show: false,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false
    }
  });

  

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true,
  }));

  mainWindow.on('ready-to-show', function () {
      loadingWindow.close();
      mainWindow.maximize();
      mainWindow.show();
      mainWindow.focus();
      mainWindow.openDevTools();
  });

  
  /* if (env.name === 'development') {
    
  } */

  //mainWindow.setMenu(null);
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true);
});

//var Tunnel = require('./tunnel');

// Listen for async message from renderer process
/* ipcMain.on('async', (event, arg) => {  
  // Print 1
  if(arg.action == "connect-tunnel"){
    var devTunnel = new Tunnel({username: "Relay-DEV-Tunnel-Service", host: "52.2.71.131", identity: "D:/PuTTYPortable/Putty Keys/openssh1.pem"});
    
  }
  console.log(arg);
  // Reply on async message from renderer process
  event.sender.send('async-reply', 2);
});

 */
