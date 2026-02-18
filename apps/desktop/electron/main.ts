import { app, BrowserWindow, shell, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

declare module 'electron' {
  interface App {
    isQuitting: boolean
  }
}

app.isQuitting = false

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

// Inline 16x16 PNG of concentric circles icon (green/red/yellow rings on dark bg)
const TRAY_ICON_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA' +
  'nElEQVQ4y2NgoAb4z8DAwMjIyPCfkKaGBgYGBgYmBgYGBiYGBgYGZgYGBgYWBgYGBl' +
  'YGBgYGNgYGBgZ2BgYGBg4GBgYGTkJewMXAwMDAzcDAwMDDwMDAwMvAwMDAx4evF/Dj6w' +
  'V8DAEyfnwN/6EuIOwF4l7Az8+PagAjOhfVADZ0LpoX2NC5OLyAnUtkYGJiIsYLAInHF' +
  'L2B3vOhAAAAAElFTkSuQmCC'

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Concentric Crypto Ticker',
    icon: join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#111827',
    autoHideMenuBar: true,
  })

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "connect-src 'self' https://api.binance.com wss://stream.binance.com:9443",
            "img-src 'self' data:",
            "media-src 'self'",
          ].join('; '),
        ],
      },
    })
  })

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  // Dev: load from Vite dev server. Prod: load built files.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createTray(): void {
  const icon = nativeImage.createFromDataURL(TRAY_ICON_DATA_URL)
  tray = new Tray(icon)
  tray.setToolTip('Concentric Crypto Ticker')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true
        app.quit()
      },
    },
  ])
  tray.setContextMenu(contextMenu)

  // Double-click tray icon to show window (Windows convention)
  tray.on('double-click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}

app.whenReady().then(() => {
  createWindow()
  createTray()

  app.on('activate', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
    } else {
      createWindow()
    }
  })
})

app.on('before-quit', () => {
  app.isQuitting = true
})

app.on('window-all-closed', () => {
  // Don't quit — the tray keeps the app alive
})
