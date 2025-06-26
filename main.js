const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow () {
  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false, // Don't show initially to avoid flicker
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  
  // Maximize and then show the window
  mainWindow.maximize()
  mainWindow.show()

  // Load the index.html file
  mainWindow.loadFile('index.html')

  // Open DevTools (optional, for debugging)
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow)

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})