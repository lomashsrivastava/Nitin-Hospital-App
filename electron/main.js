/**
 * Electron Main Process - Loads the React app in a desktop window
 */
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Check if running in development
const isDev = !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Nitin Billing App',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    // Frameless for modern look (optional)
    // frame: false,
    backgroundColor: '#0b1120',
  });

  // Load the app
  if (isDev) {
    // Development - load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production - load built files
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }

  // Remove default menu
  Menu.setApplicationMenu(null);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
