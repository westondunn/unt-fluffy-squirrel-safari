import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { initDB, closeDB } from './db';
import { registerIPC } from './ipc';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'UNT Fluffy Squirrel Safari',
    backgroundColor: '#5C94FC',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function takeScreenshots() {
  if (!mainWindow) return;
  const dir = path.resolve(__dirname, '..', '..', 'docs', 'screenshots');
  fs.mkdirSync(dir, { recursive: true });

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
  const capture = async (name: string) => {
    const img = await mainWindow!.capturePage();
    fs.writeFileSync(path.join(dir, name), img.toPNG());
    console.log(`Screenshot: ${name}`);
  };

  const exec = (js: string) => mainWindow!.webContents.executeJavaScript(js);

  await sleep(6000); // wait for map tiles
  await capture('map-view.png');

  await exec(`document.querySelectorAll('button').forEach(b => { if(b.textContent.includes('GUIDE')) b.click(); });`);
  await sleep(500);
  await capture('field-guide.png');

  await exec(`document.querySelectorAll('button').forEach(b => { if(b.textContent.includes('BADGES')) b.click(); });`);
  await sleep(500);
  await capture('badges-view.png');

  await exec(`document.querySelectorAll('button').forEach(b => { if(b.textContent.includes('CHAT')) b.click(); });`);
  await sleep(500);
  await capture('quest-complete.png');

  console.log('All screenshots saved to docs/screenshots/');
  closeDB();
  app.quit();
}

app.whenReady().then(async () => {
  await initDB();
  registerIPC();
  createWindow();

  if (process.argv.includes('--screenshots')) {
    takeScreenshots();
  }
});

app.on('window-all-closed', () => {
  closeDB();
  app.quit();
});
