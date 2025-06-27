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

// If running in Electron's renderer process, skip Electron-specific code
if (typeof require === 'undefined' || typeof window !== 'undefined') {
  // --- Canvas and Bezier Path Planner Logic ---
  const canvas = document.getElementById('pathCanvas');
  const ctx = canvas.getContext('2d');
  const backgroundImage = document.getElementById('backgroundImage');
  const coordinatesDiv = document.getElementById('coordinates');
  const clearBtn = document.getElementById('clearBtn');
  const exportBtn = document.getElementById('exportBtn');

  // Field and canvas dimensions
  const FIELD_SIZE = 144;
  const CANVAS_SIZE = 800;

  // Control points for cubic Bezier: [P0, P1, P2, P3]
  let controlPoints = [
    { x: 36, y: 36 },
    { x: 54, y: 108 },
    { x: 108, y: 54 },
    { x: 108, y: 108 }
  ];
  let draggingPoint = null;

  // --- Coordinate Mapping ---
  function canvasToFieldCoords(x, y) {
    // Canvas (0,0) is top-left; Field (0,0) is bottom-left
    const fx = (x / CANVAS_SIZE) * FIELD_SIZE;
    const fy = FIELD_SIZE - (y / CANVAS_SIZE) * FIELD_SIZE;
    return { x: fx, y: fy };
  }
  function fieldToCanvasCoords(fx, fy) {
    // Field (0,0) is bottom-left; Canvas (0,0) is top-left
    const x = (fx / FIELD_SIZE) * CANVAS_SIZE;
    const y = ((FIELD_SIZE - fy) / FIELD_SIZE) * CANVAS_SIZE;
    return { x, y };
  }

  // --- Drawing Functions ---
  function draw() {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    if (backgroundImage.complete && backgroundImage.naturalWidth) {
      ctx.drawImage(backgroundImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }
    // Draw Bezier curve
    ctx.strokeStyle = '#aaff03';
    ctx.lineWidth = 4;
    ctx.beginPath();
    const p0 = fieldToCanvasCoords(controlPoints[0].x, controlPoints[0].y);
    const p1 = fieldToCanvasCoords(controlPoints[1].x, controlPoints[1].y);
    const p2 = fieldToCanvasCoords(controlPoints[2].x, controlPoints[2].y);
    const p3 = fieldToCanvasCoords(controlPoints[3].x, controlPoints[3].y);
    ctx.moveTo(p0.x, p0.y);
    ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    ctx.stroke();
    // Draw control points
    for (let i = 0; i < 4; i++) {
      const pt = fieldToCanvasCoords(controlPoints[i].x, controlPoints[i].y);
      ctx.fillStyle = i === 0 || i === 3 ? '#aaff03' : '#ff4081';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 10, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // --- Mouse Events ---
  function getControlPointAt(x, y) {
    for (let i = 0; i < 4; i++) {
      const pt = fieldToCanvasCoords(controlPoints[i].x, controlPoints[i].y);
      if (Math.hypot(pt.x - x, pt.y - y) < 15) return i;
    }
    return null;
  }
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const idx = getControlPointAt(x, y);
    if (idx !== null) {
      draggingPoint = idx;
    }
  });
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (draggingPoint !== null) {
      const field = canvasToFieldCoords(x, y);
      controlPoints[draggingPoint] = {
        x: Math.max(0, Math.min(FIELD_SIZE, field.x)),
        y: Math.max(0, Math.min(FIELD_SIZE, field.y))
      };
      draw();
    }
    // Live coordinate readout
    const field = canvasToFieldCoords(x, y);
    coordinatesDiv.textContent = `Coordinates: (${field.x.toFixed(1).padStart(5)}, ${field.y.toFixed(1).padStart(5)})`;
  });
  canvas.addEventListener('mouseup', () => {
    draggingPoint = null;
  });
  canvas.addEventListener('mouseleave', () => {
    draggingPoint = null;
  });

  // --- Button Events ---
  clearBtn.addEventListener('click', () => {
    controlPoints = [
      { x: 36, y: 36 },
      { x: 54, y: 108 },
      { x: 108, y: 54 },
      { x: 108, y: 108 }
    ];
    draw();
  });
  exportBtn.addEventListener('click', () => {
    const data = JSON.stringify(controlPoints, null, 2);
    navigator.clipboard.writeText(data);
    alert('Path copied to clipboard!');
  });

  // --- Image Loading and Initial Draw ---
  backgroundImage.onload = draw;
  if (backgroundImage.complete) draw();
  else backgroundImage.onload = draw;
  draw();
}