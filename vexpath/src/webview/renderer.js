// Canvas setup
const canvas = document.getElementById('pathCanvas');
const ctx = canvas.getContext('2d');
const backgroundImg = document.getElementById('backgroundImage');
const coordinatesDiv = document.getElementById('coordinates');

// --- Margin settings ---
const FIELD_SIZE = 144;
const MARGIN_RATIO = 0.1; // 10% margin on each side

function getCanvasFieldRect() {
  // Returns the rectangle (x, y, width, height) of the field area within the canvas
  const marginX = canvas.width * MARGIN_RATIO;
  const marginY = canvas.height * MARGIN_RATIO;
  const fieldWidth = canvas.width - 2 * marginX;
  const fieldHeight = canvas.height - 2 * marginY;
  return { x: marginX, y: marginY, width: fieldWidth, height: fieldHeight };
}

// Function to properly size canvas
function resizeCanvas() {
  const container = canvas.parentElement;
  const containerWidth = container.clientWidth;
  
  // Use the exact full container width for the canvas size (it will be square)
  const size = containerWidth;
  
  console.log('Canvas sizing:', { containerWidth, size });
  
  // Set both CSS display size and canvas internal resolution to the same value
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  canvas.width = size;
  canvas.height = size;
  
  console.log('Canvas final dimensions:', { 
    cssWidth: canvas.style.width, 
    cssHeight: canvas.style.height, 
    internalWidth: canvas.width, 
    internalHeight: canvas.height 
  });
  
  redrawCanvas();
}

// Load and draw background image
backgroundImg.onload = function() {
  resizeCanvas();
};
backgroundImg.src = backgroundImg.src;

// --- Coordinate Mapping ---
function fieldToCanvasCoords(fieldX, fieldY) {
  // Map field (0,0)-(144,144) to the field area inside the canvas
  const rect = getCanvasFieldRect();
  const canvasX = rect.x + (fieldX / FIELD_SIZE) * rect.width;
  const canvasY = rect.y + ((FIELD_SIZE - fieldY) / FIELD_SIZE) * rect.height;
  return { x: canvasX, y: canvasY };
}

function canvasToFieldCoords(canvasX, canvasY) {
  // Allow negative/out-of-bounds field coordinates for margin
  const rect = getCanvasFieldRect();
  const fieldX = ((canvasX - rect.x) / rect.width) * FIELD_SIZE;
  const fieldY = FIELD_SIZE - ((canvasY - rect.y) / rect.height) * FIELD_SIZE;
  return { x: Math.round(fieldX * 10) / 10, y: Math.round(fieldY * 10) / 10 };
}

function formatCoordinate(num) {
  if (num === undefined || num === null || isNaN(num)) {
    return "---.-";
  }
  const formatted = num.toFixed(1);
  const sign = num >= 0 ? '' : '-';
  const paddedNum = Math.abs(num).toFixed(1).padStart(5, ' ');
  return sign + paddedNum;
}

// Initialize Bezier Manager
const bezierManager = new BezierManager(
  () => canvas,
  () => ctx,
  getCanvasFieldRect,
  {
    canvasToField: canvasToFieldCoords,
    fieldToCanvas: fieldToCanvasCoords
  }
);
// --- Drawing Function ---
function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw background image centered with margin
  const rect = getCanvasFieldRect();
  ctx.drawImage(backgroundImg, rect.x, rect.y, rect.width, rect.height);
  
  // Draw all bezier curves
  bezierManager.drawAllPaths();
}

// --- Mouse Event Handlers ---
canvas.addEventListener('mousedown', function(e) {
  const handled = bezierManager.handleMouseDown(e);
  if (handled) {
    redrawCanvas();
  }
});

canvas.addEventListener('mousemove', function(e) {
  const rect = canvas.getBoundingClientRect();
  const canvasX = e.clientX - rect.left;
  const canvasY = e.clientY - rect.top;
  
  const handled = bezierManager.handleMouseMove(e);
  if (handled) {
    redrawCanvas();
  }
  
  // Always update coordinates display
  updateCoordinatesDisplay(canvasX, canvasY);
});

canvas.addEventListener('mouseup', function(e) {
  const handled = bezierManager.handleMouseUp(e);
  if (handled) {
    redrawCanvas();
  }
});

canvas.addEventListener('mouseleave', function() {
  // Do not cancel dragging; just update coordinates display
  updateCoordinatesDisplay();
});
// --- Canvas Management Functions ---
function clearCanvas() {
  bezierManager.clearPaths();
  redrawCanvas();
}

function addNewCurve() {
  bezierManager.addNewPath();
  redrawCanvas();
}

function exportPath() {
  bezierManager.exportPath();
}

function deleteLastSection() {
  bezierManager.deleteLastSection();
  redrawCanvas();
}

function deleteCurrentCurve() {
  bezierManager.deleteCurrentPath();
  redrawCanvas();
}

function switchToCurve(index) {
  bezierManager.setActivePath(index);
  redrawCanvas();
}

function addPathSegment() {
  bezierManager.addPathSegment();
  redrawCanvas();
}

// Utility: update coordinate display with correct font for numbers
function updateCoordinatesDisplay(x, y) {
  if (typeof x === 'number' && typeof y === 'number') {
    const fieldCoords = canvasToFieldCoords(x, y);
    const formattedX = formatCoordinate(fieldCoords.x);
    const formattedY = formatCoordinate(fieldCoords.y);
    const pathInfo = `Path ${bezierManager.getActivePathIndex()} (${bezierManager.getPathCount()} total)`;
    coordinatesDiv.innerHTML = `${pathInfo} | Coordinate: <span class="coord-numbers">(${formattedX}, ${formattedY})</span>`;
  } else {
    const pathInfo = `Path ${bezierManager.getActivePathIndex()} (${bezierManager.getPathCount()} total)`;
    coordinatesDiv.innerHTML = `${pathInfo} | Coordinate: <span class="coord-numbers">(-, -)</span>`;
  }
}

window.clearCanvas = clearCanvas;
window.exportPath = exportPath;
window.addNewCurve = addNewCurve;
window.addPathSegment = addPathSegment;
window.deleteLastSection = deleteLastSection;
window.deleteCurrentCurve = deleteCurrentCurve;
window.switchToCurve = switchToCurve;

// --- Keyboard Shortcuts ---
document.addEventListener('keydown', function(e) {
  if (e.key === 'n') {
    addNewCurve();
    e.preventDefault();
  } else if (e.key === 's') {
    addPathSegment();
    e.preventDefault();
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    deleteCurrentCurve();
    e.preventDefault();
  } else if (e.key === 'x') {
    deleteLastSection();
    e.preventDefault();
  }
});

// On load, set initial display
updateCoordinatesDisplay(0, 0);

// Handle window resize to update canvas size
window.addEventListener('resize', resizeCanvas);

// Initialize canvas size immediately
resizeCanvas();
