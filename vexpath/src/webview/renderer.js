// Canvas setup
const canvas = document.getElementById('pathCanvas');
const ctx = canvas.getContext('2d');
const backgroundImg = document.getElementById('backgroundImage');
const coordinatesDiv = document.getElementById('coordinates');

let bezierCurves = [
  [
    { x: 100, y: 100 },
    { x: 200, y: 200 },
    { x: 300, y: 100 },
    { x: 400, y: 200 }
  ]
];
let activeCurveIndex = 0;
let controlPoints = bezierCurves[activeCurveIndex];
let isDrawing = false;
let isDragging = false;
let dragPointIndex = -1;
let dragOffset = {x: 0, y: 0};

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

// Load and draw background image
backgroundImg.onload = function() {
  // Make canvas square and as large as possible
  const maxWidth = window.innerWidth * 0.95;
  const maxHeight = window.innerHeight * 0.8;
  const size = Math.min(maxWidth, maxHeight);
  canvas.width = size;
  canvas.height = size;
  redrawCanvas();
};
backgroundImg.src = backgroundImg.src;

function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw background image centered with margin
  const rect = getCanvasFieldRect();
  ctx.drawImage(backgroundImg, rect.x, rect.y, rect.width, rect.height);
  bezierCurves.forEach((curve, idx) => {
    const color = getCurveColor(idx, idx === activeCurveIndex);
    drawBezierPath(curve, idx === activeCurveIndex, color);
    drawControlPoints(curve, idx === activeCurveIndex, color);
  });
}

// Store a color for each curve so colors don't change when deleting
let curveColors = [];

function getCurveColor(idx, active) {
  // Use stored color if available, else generate and store
  if (!curveColors[idx]) {
    // Use HSL for visually distinct colors
    const hue = (idx * 67) % 360;
    const sat = active ? 90 : 70;
    const light = active ? 55 : 40;
    curveColors[idx] = `hsl(${hue}, ${sat}%, ${light}%)`;
  }
  // Always return the stored color, but highlight if active
  if (active) {
    // Make active curve a bit lighter
    return curveColors[idx].replace(/(\d+)%\)/, '70%)');
  }
  return curveColors[idx];
}

// Allow control points to move up to 10% outside the canvas for display/export
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
function getPointUnderMouse(mouseX, mouseY) {
  for (let c = 0; c < bezierCurves.length; c++) {
    const curve = bezierCurves[c];
    for (let i = 0; i < curve.length; i++) {
      const point = curve[i];
      const distance = Math.sqrt((mouseX - point.x) ** 2 + (mouseY - point.y) ** 2);
      if (distance <= 8) {
        return { curveIndex: c, pointIndex: i };
      }
    }
  }
  return null;
}
function drawControlPoints(points, isActive, color) {
  points.forEach((point, index) => {
    if (isActive && isDragging && index === dragPointIndex) {
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(index + 1, point.x, point.y + 4);
  });
}
function drawBezierPath(points, isActive, color) {
  if (points.length < 4) {
    return;
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = isActive ? 5 : 3; // Thicker main curve
  ctx.beginPath();
  for (let i = 0; i <= points.length - 4; i += 3) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const p2 = points[i + 2];
    const p3 = points[i + 3];
    if (i === 0) {
      ctx.moveTo(p0.x, p0.y);
    }
    ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= points.length - 4; i += 3) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const p2 = points[i + 2];
    const p3 = points[i + 3];
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.stroke();
  }
}
canvas.addEventListener('mousedown', function(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const hit = getPointUnderMouse(x, y);
  if (hit) {
    isDragging = true;
    dragPointIndex = hit.pointIndex;
    activeCurveIndex = hit.curveIndex;
    controlPoints = bezierCurves[activeCurveIndex];
    dragOffset.x = x - controlPoints[dragPointIndex].x;
    dragOffset.y = y - controlPoints[dragPointIndex].y;
    canvas.style.cursor = 'grabbing';
    redrawCanvas();
  } else {
    // Enforce C1 continuity for all extensions (after the first 4 points)
    if (controlPoints.length >= 4 && (controlPoints.length - 1) % 3 === 0) {
      // Last point is the previous segment's end, second-to-last is previous control
      const prevP3 = controlPoints[controlPoints.length - 1];
      const prevP2 = controlPoints[controlPoints.length - 2];
      // Reflect prevP2 about prevP3 for C1 continuity
      const reflected = {
        x: 2 * prevP3.x - prevP2.x,
        y: 2 * prevP3.y - prevP2.y
      };
      controlPoints.push(reflected);
      controlPoints.push({x, y});
    } else {
      controlPoints.push({x, y});
    }
    redrawCanvas();
  }
});
canvas.addEventListener('mousemove', function(e) {
  const rect = canvas.getBoundingClientRect();
  const canvasX = e.clientX - rect.left;
  const canvasY = e.clientY - rect.top;
  if (isDragging && dragPointIndex !== -1) {
    // Clamp to slightly inside the canvas (2px margin)
    const clampMargin = 2;
    const clampedX = Math.max(clampMargin, Math.min(canvasX - dragOffset.x, canvas.width - clampMargin));
    const clampedY = Math.max(clampMargin, Math.min(canvasY - dragOffset.y, canvas.height - clampMargin));
    controlPoints[dragPointIndex].x = clampedX;
    controlPoints[dragPointIndex].y = clampedY;
    // Bidirectional C1 continuity at joins
    // If this is the handle after a join (index % 3 === 1), reflect the handle before the anchor
    if (dragPointIndex % 3 === 1 && dragPointIndex > 1) {
      const joinIdx = dragPointIndex;
      const anchor = controlPoints[joinIdx - 1];
      const handleAfter = controlPoints[joinIdx];
      const handleBeforeIdx = joinIdx - 2;
      if (handleBeforeIdx >= 0) {
        controlPoints[handleBeforeIdx].x = 2 * anchor.x - handleAfter.x;
        controlPoints[handleBeforeIdx].y = 2 * anchor.y - handleAfter.y;
      }
    }
    // If this is the handle before a join (index % 3 === 2), reflect the handle after the anchor
    if (dragPointIndex % 3 === 2 && dragPointIndex > 1) {
      const handleBeforeIdx = dragPointIndex;
      const anchorIdx = handleBeforeIdx + 1;
      const handleAfterIdx = anchorIdx + 1;
      if (anchorIdx < controlPoints.length && handleAfterIdx < controlPoints.length) {
        const anchor = controlPoints[anchorIdx];
        const handleBefore = controlPoints[handleBeforeIdx];
        controlPoints[handleAfterIdx].x = 2 * anchor.x - handleBefore.x;
        controlPoints[handleAfterIdx].y = 2 * anchor.y - handleBefore.y;
      }
    }
    redrawCanvas();
  } else {
    const hit = getPointUnderMouse(canvasX, canvasY);
    canvas.style.cursor = hit ? 'grab' : 'crosshair';
  }
  updateCoordinatesDisplay(canvasX, canvasY);
});
canvas.addEventListener('mouseup', function(e) {
  if (isDragging) {
    isDragging = false;
    dragPointIndex = -1;
    canvas.style.cursor = 'crosshair';
    redrawCanvas();
  }
});
// Remove drag cancel on mouseleave; allow dragging even if mouse leaves canvas
canvas.addEventListener('mouseleave', function() {
  // Do not cancel dragging; just update coordinates display
  updateCoordinatesDisplay();
});
function clearCanvas() {
  bezierCurves = [];
  addNewCurve();
  redrawCanvas();
}
function addNewCurve() {
  // Place new curve in a grid pattern to avoid overlap
  const gridSize = 120;
  const offset = bezierCurves.length * 40;
  const newCurve = [
    { x: 100 + offset, y: 100 + offset },
    { x: 200 + offset, y: 200 + offset },
    { x: 300 + offset, y: 100 + offset },
    { x: 400 + offset, y: 200 + offset }
  ];
  bezierCurves.push(newCurve);
  // Assign a new color for this curve
  const idx = bezierCurves.length - 1;
  // Use HSL for visually distinct colors
  const hue = (idx * 67) % 360;
  curveColors[idx] = `hsl(${hue}, 70%, 40%)`;
  activeCurveIndex = idx;
  controlPoints = bezierCurves[activeCurveIndex];
  redrawCanvas();
}
function exportPath() {
  // Export each segment as Path p(x0,y0, x1,y1, x2,y2, x3,y3); then p += ...
  let output = '';
  let segNum = 1;
  for (let i = 0; i <= controlPoints.length - 4; i += 3) {
    // Convert to field coordinates with 1 decimal place
    const p0 = canvasToFieldCoords(controlPoints[i].x, controlPoints[i].y);
    const p1 = canvasToFieldCoords(controlPoints[i + 1].x, controlPoints[i + 1].y);
    const p2 = canvasToFieldCoords(controlPoints[i + 2].x, controlPoints[i + 2].y);
    const p3 = canvasToFieldCoords(controlPoints[i + 3].x, controlPoints[i + 3].y);
    if (i === 0) {
      output += `Path p(${p0.x.toFixed(1)},${p0.y.toFixed(1)}, ${p1.x.toFixed(1)},${p1.y.toFixed(1)}, ${p2.x.toFixed(1)},${p2.y.toFixed(1)}, ${p3.x.toFixed(1)},${p3.y.toFixed(1)});\n`;
    } else {
      output += `p += Path(${p0.x.toFixed(1)},${p0.y.toFixed(1)}, ${p1.x.toFixed(1)},${p1.y.toFixed(1)}, ${p2.x.toFixed(1)},${p2.y.toFixed(1)}, ${p3.x.toFixed(1)},${p3.y.toFixed(1)});\n`;
    }
    segNum++;
  }
  // Copy to clipboard
  navigator.clipboard.writeText(output).then(() => {
    alert('Path copied to clipboard!');
  }, () => {
    alert('Failed to copy path to clipboard.');
  });
}
function deleteLastSection() {
  if (!controlPoints || controlPoints.length <= 4) { 
    return; // Can't delete the initial segment
  }
  // Remove the last 3 points (one cubic Bezier section)
  controlPoints.splice(-3, 3);
  // If the curve is now shorter than 4 points, reset to just the first segment
  if (controlPoints.length < 4) {
    controlPoints.length = 4;
  }
  redrawCanvas();
}
function deleteCurrentCurve() {
  if (bezierCurves.length === 0) {
    return;
  }
  bezierCurves.splice(activeCurveIndex, 1);
  curveColors.splice(activeCurveIndex, 1); // Remove color for deleted curve
  if (bezierCurves.length === 0) {
    // If all curves deleted, add a new one and set activeCurveIndex to 0
    bezierCurves.push([
      { x: 100, y: 100 },
      { x: 200, y: 200 },
      { x: 300, y: 100 },
      { x: 400, y: 200 }
    ]);
    curveColors.push('hsl(0, 70%, 40%)');
    activeCurveIndex = 0;
  } else {
    // Select previous curve if possible, else first
    activeCurveIndex = Math.max(0, activeCurveIndex - 1);
  }
  controlPoints = bezierCurves[activeCurveIndex];
  redrawCanvas();
}

// Utility: update coordinate display with correct font for numbers
function updateCoordinatesDisplay(x, y) {
  if (typeof x === 'number' && typeof y === 'number') {
    const fieldCoords = canvasToFieldCoords(x, y);
    const formattedX = formatCoordinate(fieldCoords.x);
    const formattedY = formatCoordinate(fieldCoords.y);
    coordinatesDiv.innerHTML = `Coordinate: <span class="coord-numbers">(${formattedX}, ${formattedY})</span>`;
  } else {
    coordinatesDiv.innerHTML = 'Coordinate: <span class="coord-numbers">(-, -)</span>';
  }
}

window.clearCanvas = clearCanvas;
window.exportPath = exportPath;
window.addNewCurve = addNewCurve;
window.deleteLastSection = deleteLastSection;
window.deleteCurrentCurve = deleteCurrentCurve;

// On load, set initial display
updateCoordinatesDisplay(0, 0);
