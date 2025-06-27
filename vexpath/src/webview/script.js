// --- Canvas and Bezier Path Planner Logic ---
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('pathCanvas');
  const ctx = canvas.getContext('2d');
  const backgroundImage = document.getElementById('backgroundImage');
  const coordinatesDiv = document.getElementById('coordinates');
  const clearBtn = document.getElementById('clearBtn');
  const exportBtn = document.getElementById('exportBtn');

  // Field and canvas dimensions
  const FIELD_SIZE = 144;
  const CANVAS_SIZE = 800;
  const FIELD_SCALE = 0.8;

  // --- Multi-curve State ---
  let curves = [
    [
      { x: 36, y: 36 },
      { x: 54, y: 108 },
      { x: 108, y: 54 },
      { x: 108, y: 108 }
    ]
  ];
  let curveColors = ['#aaff03', '#ff4081', '#03aaff', '#ff03a9', '#ffaa03', '#03ffaa'];
  let currentCurve = 0;
  let draggingPoint = null;
  let draggingCurve = null;
  let mouseDown = false;

  // --- Coordinate Mapping ---
  function canvasToFieldCoords(x, y) {
    // Map only the 80% centered image area to field coordinates, allow out-of-bounds
    const imgWidth = canvas.width * FIELD_SCALE;
    const imgHeight = canvas.height * FIELD_SCALE;
    const offsetX = (canvas.width * (1 - FIELD_SCALE)) / 2;
    const offsetY = (canvas.height * (1 - FIELD_SCALE)) / 2;
    // 0,0 should be bottom-left of image, 144,144 top-right
    const fx = ((x - offsetX) / imgWidth) * FIELD_SIZE;
    const fy = ((y - (offsetY + imgHeight)) / -imgHeight) * FIELD_SIZE;
    return { x: fx, y: fy};
  }
  function fieldToCanvasCoords(fx, fy) {
    // Map field coordinates to the 80% centered image area
    const imgWidth = canvas.width * FIELD_SCALE;
    const imgHeight = canvas.height * FIELD_SCALE;
    const offsetX = (canvas.width - imgWidth) / 2;
    const offsetY = (canvas.height - imgHeight) / 2;
    // 0,0 is bottom-left, 144,144 is top-right
    const x = offsetX + (fx / FIELD_SIZE) * imgWidth;
    const y = offsetY + imgHeight - (fy / FIELD_SIZE) * imgHeight;
    return { x, y };
  }

  // --- Drawing Functions ---
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (backgroundImage && backgroundImage.complete && backgroundImage.naturalWidth) {
      // Draw the image at 80% of the canvas size, centered
      const imgWidth = canvas.width * FIELD_SCALE;
      const imgHeight = canvas.height * FIELD_SCALE;
      const offsetX = (canvas.width - imgWidth) / 2;
      const offsetY = (canvas.height - imgHeight) / 2;
      ctx.drawImage(backgroundImage, 0, 0, backgroundImage.naturalWidth, backgroundImage.naturalHeight, offsetX, offsetY, imgWidth, imgHeight);
    }
    // Draw all curves
    for (let i = 0; i < curves.length; i++) {
      const curve = curves[i];
      ctx.strokeStyle = curveColors[i % curveColors.length];
      ctx.lineWidth = (i === currentCurve) ? 5 : 3;
      ctx.beginPath();
      for (let j = 0; j < curve.length - 3; j += 3) {
        const p0 = fieldToCanvasCoords(curve[j].x, curve[j].y);
        const p1 = fieldToCanvasCoords(curve[j+1].x, curve[j+1].y);
        const p2 = fieldToCanvasCoords(curve[j+2].x, curve[j+2].y);
        const p3 = fieldToCanvasCoords(curve[j+3].x, curve[j+3].y);
        ctx.moveTo(p0.x, p0.y);
        ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
      }
      ctx.stroke();
      // Draw control points for current curve
      if (i === currentCurve) {
        for (let k = 0; k < curve.length; k++) {
          const pt = fieldToCanvasCoords(curve[k].x, curve[k].y);
          ctx.fillStyle = (k % 3 === 0) ? curveColors[i % curveColors.length] : '#ff4081';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 10, 0, 2 * Math.PI);
          ctx.fill();
          ctx.strokeStyle = '#222';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }
  }

  // --- Mouse Events ---
  function getControlPointAt(x, y) {
    const curve = curves[currentCurve];
    for (let i = 0; i < curve.length; i++) {
      const pt = fieldToCanvasCoords(curve[i].x, curve[i].y);
      if (Math.hypot(pt.x - x, pt.y - y) < 15) {
        return i;
      }
    }
    return null;
  }
  function getScaledMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }
  canvas.addEventListener('mousedown', (e) => {
    mouseDown = true;
    const { x, y } = getScaledMousePos(e);
    const idx = getControlPointAt(x, y);
    if (idx !== null) {
      draggingPoint = idx;
    }
  });
  canvas.addEventListener('mousemove', (e) => {
    const { x, y } = getScaledMousePos(e);
    if (!mouseDown || draggingPoint === null) {
      // Live coordinate readout even if not dragging
      const field = canvasToFieldCoords(x, y);
      if (coordinatesDiv) {
        coordinatesDiv.textContent = `Coordinates: (${field.x.toFixed(1).padStart(5)}, ${field.y.toFixed(1).padStart(5)})`;
      }
      return;
    }
    const field = canvasToFieldCoords(x, y);
    const curve = curves[currentCurve];
    // Store original values for C1 continuity
    let prevOrig = null, nextOrig = null;
    if (draggingPoint % 3 === 0) {
      if (draggingPoint > 0) {
        prevOrig = { ...curve[draggingPoint - 1] };
      }
      if (draggingPoint < curve.length - 1) {
        nextOrig = { ...curve[draggingPoint + 1] };
      }
    }
    curve[draggingPoint] = {
      x: Math.max(0, Math.min(FIELD_SIZE, field.x)),
      y: Math.max(0, Math.min(FIELD_SIZE, field.y))
    };
    // C1 continuity: if moving a shared point, move adjacent control points
    if (draggingPoint % 3 === 0) {
      // Only update previous if not first anchor
      if (draggingPoint > 0 && prevOrig) {
        const anchor = curve[draggingPoint];
        curve[draggingPoint - 1] = {
          x: 2 * anchor.x - prevOrig.x,
          y: 2 * anchor.y - prevOrig.y
        };
      }
      // Only update next if not last anchor
      if (draggingPoint < curve.length - 1 && nextOrig) {
        const anchor = curve[draggingPoint];
        curve[draggingPoint + 1] = {
          x: 2 * anchor.x - nextOrig.x,
          y: 2 * anchor.y - nextOrig.y
        };
      }
    }
    draw();
    // Live coordinate readout
    if (coordinatesDiv) {
      coordinatesDiv.textContent = `Coordinates: (${field.x.toFixed(1).padStart(5)}, ${field.y.toFixed(1).padStart(5)})`;
    }
  });
  canvas.addEventListener('mouseup', () => {
    mouseDown = false;
    draggingPoint = null;
  });
  canvas.addEventListener('mouseleave', () => {
    mouseDown = false;
    draggingPoint = null;
  });

  // --- Curve Management Functions ---
  function addNewCurve() {
    const lastCurve = curves[curves.length - 1];
    const lastPt = lastCurve[lastCurve.length - 1];
    // New curve starts at last point, with default control points
    const newCurve = [
      { x: lastPt.x, y: lastPt.y },
      { x: lastPt.x + 18, y: lastPt.y + 18 },
      { x: lastPt.x + 36, y: lastPt.y + 36 },
      { x: lastPt.x + 54, y: lastPt.y + 54 }
    ];
    curves.push(newCurve);
    currentCurve = curves.length - 1;
    draw();
  }
  function deleteCurrentCurve() {
    if (curves.length > 1) {
      curves.splice(currentCurve, 1);
      currentCurve = Math.max(0, currentCurve - 1);
      draw();
    }
  }
  function switchCurve(idx) {
    if (idx >= 0 && idx < curves.length) {
      currentCurve = idx;
      draw();
    }
  }
  function addSectionToCurrentCurve() {
    const curve = curves[currentCurve];
    const n = curve.length;
    const last = curve[n - 1];
    const prev = curve[n - 2];
    // C1 continuity: reflect last control point
    const dx = last.x - prev.x;
    const dy = last.y - prev.y;
    const p1 = { x: last.x + dx, y: last.y + dy };
    const p2 = { x: last.x + dx * 2, y: last.y + dy * 2 };
    const p3 = { x: last.x + dx * 3, y: last.y + dy * 3 };
    curve.push(p1, p2, p3);
    draw();
  }
  function deleteLastSection() {
    const curve = curves[currentCurve];
    if (curve.length > 4) {
      curve.splice(-3, 3);
      draw();
    }
  }
  function clearCanvas() {
    curves = [
      [
        { x: 36, y: 36 },
        { x: 54, y: 108 },
        { x: 108, y: 54 },
        { x: 108, y: 108 }
      ]
    ];
    currentCurve = 0;
    draw();
  }
  function exportPath() {
    // Export all curves as a flat array of points
    const allPoints = curves.flat();
    const data = JSON.stringify(allPoints, null, 2);
    navigator.clipboard.writeText(data);
    alert('Path copied to clipboard!');
  }

  // --- Button Events ---
  if (clearBtn) {
    clearBtn.addEventListener('click', clearCanvas);
  }
  if (exportBtn) {
    exportBtn.addEventListener('click', exportPath);
  }

  // --- Expose Utility Functions for Buttons ---
  window.clearCanvas = clearCanvas;
  window.exportPath = exportPath;
  window.addNewCurve = addNewCurve;
  window.deleteLastSection = deleteLastSection;
  window.deleteCurrentCurve = deleteCurrentCurve;
  window.switchCurve = switchCurve;
  window.addSectionToCurrentCurve = addSectionToCurrentCurve;

  // --- Image Loading and Initial Draw ---
  function resizeCanvasToFit() {
    // Use window size and CSS max-width/max-height to determine size
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.9;
    // Maintain aspect ratio of the image if loaded, else use square
    let aspect = 1;
    if (backgroundImage && backgroundImage.naturalWidth && backgroundImage.naturalHeight) {
      aspect = backgroundImage.naturalWidth / backgroundImage.naturalHeight;
    }
    let width = maxWidth;
    let height = maxWidth / aspect;
    if (height > maxHeight) {
      height = maxHeight;
      width = maxHeight * aspect;
    }
    canvas.width = width;
    canvas.height = height;
    // Resize the img element to match the drawn image area (for debugging or overlay)
    const imgWidth = width * FIELD_SCALE;
    const imgHeight = height * FIELD_SCALE;
    const offsetX = (width - imgWidth) / 2;
    const offsetY = (height - imgHeight) / 2;
    // Resize and position the img element to match the drawn image area
    backgroundImage.style.width = imgWidth + 'px';
    backgroundImage.style.height = imgHeight + 'px';
    backgroundImage.style.left = offsetX + 'px';
    backgroundImage.style.top = offsetY + 'px';
    backgroundImage.style.position = 'absolute';
    backgroundImage.style.display = 'none'; // Show for debugging, hide if not needed
    backgroundImage.style.pointerEvents = 'none';
    backgroundImage.style.opacity = '0.2';
  }

  window.addEventListener('resize', () => {
    resizeCanvasToFit();
    draw();
  });

  if (backgroundImage) {
    backgroundImage.onload = function() {
      resizeCanvasToFit();
      draw();
    };
    if (backgroundImage.complete && backgroundImage.naturalWidth) {
      resizeCanvasToFit();
      draw();
    }
  }
  resizeCanvasToFit();
  draw();
});
