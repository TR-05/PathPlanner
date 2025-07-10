// --- Bezier Path Class ---
class BezierPath {
  constructor(startX = 0.2, startY = 0.2) {
    // Store coordinates in normalized form (0-1 range)
    this.points = [
      { x: startX, y: startY },
      { x: startX + 0.2, y: startY + 0.2 },
      { x: startX + 0.4, y: startY },
      { x: startX + 0.6, y: startY + 0.2 }
    ];
    this.color = 'hsl(0, 70%, 40%)';
  }

  // Get all points in this path, converted to canvas coordinates
  getPoints(canvasWidth = 500, canvasHeight = 500) {
    return this.points.map(point => ({
      x: point.x * canvasWidth,
      y: point.y * canvasHeight
    }));
  }

  // Get raw normalized points (0-1 range)
  getRawPoints() {
    return this.points;
  }

  // Set a point using canvas coordinates
  setPoint(index, canvasX, canvasY, canvasWidth, canvasHeight) {
    if (index >= 0 && index < this.points.length) {
      this.points[index].x = canvasX / canvasWidth;
      this.points[index].y = canvasY / canvasHeight;
    }
  }

  // Add a new point to extend the path (input in canvas coordinates)
  addPoint(canvasX, canvasY, canvasWidth, canvasHeight) {
    const normalizedX = canvasX / canvasWidth;
    const normalizedY = canvasY / canvasHeight;
    
    // Apply C1 continuity when extending
    if (this.points.length >= 4 && (this.points.length - 1) % 3 === 0) {
      // Last point is the previous segment's end, second-to-last is previous control
      const prevP3 = this.points[this.points.length - 1];
      const prevP2 = this.points[this.points.length - 2];
      // Reflect prevP2 about prevP3 for C1 continuity
      const reflected = {
        x: 2 * prevP3.x - prevP2.x,
        y: 2 * prevP3.y - prevP2.y
      };
      this.points.push(reflected);
      this.points.push({x: normalizedX, y: normalizedY});
    } else {
      // Just add the point
      this.points.push({x: normalizedX, y: normalizedY});
    }
  }

  // Delete the last section (3 points)
  deleteLastSection() {
    if (this.points.length <= 4) { 
      return false; // Can't delete the initial segment
    }
    // Remove the last 3 points (one cubic Bezier section)
    this.points.splice(-3, 3);
    // If the path is now shorter than 4 points, reset to just the first segment
    if (this.points.length < 4) {
      this.points.length = 4;
    }
    return true;
  }

  // Get the first point of this path
  getFirstPoint(canvasWidth = 500, canvasHeight = 500) {
    if (this.points.length > 0) {
      return {
        x: this.points[0].x * canvasWidth,
        y: this.points[0].y * canvasHeight
      };
    }
    return null;
  }

  // Get the last point of this path
  getLastPoint(canvasWidth = 500, canvasHeight = 500) {
    if (this.points.length > 0) {
      const lastPoint = this.points[this.points.length - 1];
      return {
        x: lastPoint.x * canvasWidth,
        y: lastPoint.y * canvasHeight
      };
    }
    return null;
  }

  // Get the second-to-last point (for tangency calculations)
  getSecondToLastPoint(canvasWidth = 500, canvasHeight = 500) {
    if (this.points.length > 1) {
      const secondToLast = this.points[this.points.length - 2];
      return {
        x: secondToLast.x * canvasWidth,
        y: secondToLast.y * canvasHeight
      };
    }
    return null;
  }

  // Set the color of this path
  setColor(color) {
    this.color = color;
  }

  // Get the color of this path
  getColor() {
    return this.color;
  }

  // Check if a point is under the mouse
  getPointUnderMouse(mouseX, mouseY, canvasWidth, canvasHeight) {
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i];
      const canvasX = point.x * canvasWidth;
      const canvasY = point.y * canvasHeight;
      const distance = Math.sqrt((mouseX - canvasX) ** 2 + (mouseY - canvasY) ** 2);
      if (distance <= 8) {
        return i;
      }
    }
    return null;
  }

  // Check if the path curve is under the mouse
  isCurveUnderMouse(mouseX, mouseY, canvasWidth, canvasHeight) {
    const tolerance = 8; // pixels
    
    if (this.points.length < 4) {
      return false;
    }
    
    // Check each bezier segment in the path
    for (let i = 0; i <= this.points.length - 4; i += 3) {
      const p0 = { x: this.points[i].x * canvasWidth, y: this.points[i].y * canvasHeight };
      const p1 = { x: this.points[i + 1].x * canvasWidth, y: this.points[i + 1].y * canvasHeight };
      const p2 = { x: this.points[i + 2].x * canvasWidth, y: this.points[i + 2].y * canvasHeight };
      const p3 = { x: this.points[i + 3].x * canvasWidth, y: this.points[i + 3].y * canvasHeight };
      
      // Sample points along the bezier curve and check distance
      for (let t = 0; t <= 1; t += 0.05) {
        const bezierPoint = this.evaluateBezier(p0, p1, p2, p3, t);
        const distance = Math.sqrt((mouseX - bezierPoint.x) ** 2 + (mouseY - bezierPoint.y) ** 2);
        if (distance <= tolerance) {
          return true;
        }
      }
    }
    return false;
  }

  // Evaluate bezier curve at parameter t
  evaluateBezier(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;
    
    return {
      x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
    };
  }

  // Maintain C1 continuity within this path
  maintainC1Continuity(dragPointIndex) {
    // Skip node 0 (first point) - no tangency constraints
    if (dragPointIndex === 0) {
      return;
    }

    // If dragging an anchor point (index % 3 === 0 and index > 0), maintain tangency of adjacent control points
    if (dragPointIndex % 3 === 0 && dragPointIndex > 0 && dragPointIndex < this.points.length - 1) {
      // This is an anchor point between segments
      const anchorIdx = dragPointIndex;
      const handleBeforeIdx = anchorIdx - 1;
      const handleAfterIdx = anchorIdx + 1;
      
      if (handleBeforeIdx >= 0 && handleAfterIdx < this.points.length) {
        const anchor = this.points[anchorIdx];
        const handleBefore = this.points[handleBeforeIdx];
        const handleAfter = this.points[handleAfterIdx];
        
        // Calculate the current lengths of both control handles
        const beforeLength = Math.sqrt(
          (handleBefore.x - anchor.x) ** 2 + (handleBefore.y - anchor.y) ** 2
        );
        const afterLength = Math.sqrt(
          (handleAfter.x - anchor.x) ** 2 + (handleAfter.y - anchor.y) ** 2
        );
        
        // Use the average of both lengths to make them equidistant
        const averageLength = (beforeLength + afterLength) / 2;
        
        // Calculate the direction from handleBefore to anchor
        const direction = {
          x: anchor.x - handleBefore.x,
          y: anchor.y - handleBefore.y
        };
        
        const dirLength = Math.sqrt(direction.x ** 2 + direction.y ** 2);
        if (dirLength > 0) {
          const normalizedDir = {
            x: direction.x / dirLength,
            y: direction.y / dirLength
          };
          
          // Update both handles to maintain tangency with equal distances from anchor
          this.points[handleBeforeIdx].x = anchor.x - normalizedDir.x * averageLength;
          this.points[handleBeforeIdx].y = anchor.y - normalizedDir.y * averageLength;
          this.points[handleAfterIdx].x = anchor.x + normalizedDir.x * averageLength;
          this.points[handleAfterIdx].y = anchor.y + normalizedDir.y * averageLength;
        }
      }
    }
    // If this is the handle after a join (index % 3 === 1), reflect the handle before the anchor
    else if (dragPointIndex % 3 === 1 && dragPointIndex > 1) {
      const joinIdx = dragPointIndex;
      const anchor = this.points[joinIdx - 1];
      const handleAfter = this.points[joinIdx];
      const handleBeforeIdx = joinIdx - 2;
      if (handleBeforeIdx >= 0) {
        this.points[handleBeforeIdx].x = 2 * anchor.x - handleAfter.x;
        this.points[handleBeforeIdx].y = 2 * anchor.y - handleAfter.y;
      }
    }
    // If this is the handle before a join (index % 3 === 2), reflect the handle after the anchor
    else if (dragPointIndex % 3 === 2 && dragPointIndex > 1) {
      const handleBeforeIdx = dragPointIndex;
      const anchorIdx = handleBeforeIdx + 1;
      const handleAfterIdx = anchorIdx + 1;
      if (anchorIdx < this.points.length && handleAfterIdx < this.points.length) {
        const anchor = this.points[anchorIdx];
        const handleBefore = this.points[handleBeforeIdx];
        this.points[handleAfterIdx].x = 2 * anchor.x - handleBefore.x;
        this.points[handleAfterIdx].y = 2 * anchor.y - handleBefore.y;
      }
    }
  }
}

// --- Bezier Curve Management ---
class BezierManager {
  constructor(canvasGetter, contextGetter, getCanvasFieldRectFn, coordinateConverters) {
    this.getCanvas = canvasGetter;
    this.getContext = contextGetter;
    this.getCanvasFieldRect = getCanvasFieldRectFn;
    this.canvasToFieldCoords = coordinateConverters.canvasToField;
    this.fieldToCanvasCoords = coordinateConverters.fieldToCanvas;
    
    // Array of BezierPath instances (paths store normalized coordinates)
    this.paths = [new BezierPath(0.2, 0.2)];
    this.paths[0].setColor('hsl(0, 70%, 40%)');
    this.activePathIndex = 0;
    
    // Interaction state
    this.isDragging = false;
    this.dragPointIndex = -1;
    this.dragOffset = { x: 0, y: 0 };
  }

  // --- Helper Methods ---
  getCurrentPath() {
    return this.paths[this.activePathIndex];
  }

  setActivePath(index) {
    if (index >= 0 && index < this.paths.length) {
      this.activePathIndex = index;
    }
  }

  getPathColor(idx, active) {
    const path = this.paths[idx];
    if (!path) {
      return 'hsl(0, 70%, 40%)';
    }
    
    if (active) {
      // Make active path a bit lighter
      return path.getColor().replace(/(\d+)%\)/, '70%)');
    }
    return path.getColor();
  }

  // --- Drawing Functions ---
  drawControlPoints(points, isActive, color) {
    const ctx = this.getContext();
    points.forEach((point, index) => {
      // Draw a larger highlight for active path points
      if (isActive) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 12, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      if (isActive && this.isDragging && index === this.dragPointIndex) {
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

  drawBezierPath(points, isActive, color) {
    if (points.length < 4) {
      return;
    }
    const ctx = this.getContext();
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
    
    // Draw control lines
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

  drawAllPaths() {
    const canvas = this.getCanvas();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    this.paths.forEach((path, idx) => {
      const color = this.getPathColor(idx, idx === this.activePathIndex);
      const points = path.getPoints(canvasWidth, canvasHeight);
      this.drawBezierPath(points, idx === this.activePathIndex, color);
      this.drawControlPoints(points, idx === this.activePathIndex, color);
    });
  }

  // --- Mouse Interaction ---
  getPointUnderMouse(mouseX, mouseY) {
    const canvas = this.getCanvas();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    for (let p = 0; p < this.paths.length; p++) {
      const path = this.paths[p];
      const pointIndex = path.getPointUnderMouse(mouseX, mouseY, canvasWidth, canvasHeight);
      if (pointIndex !== null) {
        return { pathIndex: p, pointIndex: pointIndex };
      }
    }
    return null;
  }

  getPathUnderMouse(mouseX, mouseY) {
    const canvas = this.getCanvas();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    for (let p = 0; p < this.paths.length; p++) {
      const path = this.paths[p];
      if (path.isCurveUnderMouse(mouseX, mouseY, canvasWidth, canvasHeight)) {
        return p;
      }
    }
    return null;
  }

  handleMouseDown(e) {
    const canvas = this.getCanvas();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = this.getPointUnderMouse(x, y);
    
    if (hit) {
      this.isDragging = true;
      this.dragPointIndex = hit.pointIndex;
      this.activePathIndex = hit.pathIndex;
      const currentPath = this.getCurrentPath();
      const points = currentPath.getPoints(canvas.width, canvas.height);
      this.dragOffset.x = x - points[this.dragPointIndex].x;
      this.dragOffset.y = y - points[this.dragPointIndex].y;
      canvas.style.cursor = 'grabbing';
      return true; // Handled
    } else {
      // Check if clicking on a path curve (not just control points)
      const clickedPath = this.getPathUnderMouse(x, y);
      if (clickedPath !== null) {
        this.activePathIndex = clickedPath;
        return true; // Handled
      }
      
      // No automatic point addition - now handled by button
      return false; // Not handled
    }
  }

  handleMouseMove(e) {
    const canvas = this.getCanvas();
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    if (this.isDragging && this.dragPointIndex !== -1) {
      // Clamp to slightly inside the canvas (2px margin)
      const clampMargin = 2;
      const clampedX = Math.max(clampMargin, Math.min(canvasX - this.dragOffset.x, canvas.width - clampMargin));
      const clampedY = Math.max(clampMargin, Math.min(canvasY - this.dragOffset.y, canvas.height - clampMargin));
      
      const currentPath = this.getCurrentPath();
      currentPath.setPoint(this.dragPointIndex, clampedX, clampedY, canvas.width, canvas.height);
      
      // Apply C1 continuity within the path
      currentPath.maintainC1Continuity(this.dragPointIndex);
      
      // Apply tangency between path connections
      this.maintainInterPathTangency();
      
      return true; // Handled
    } else {
      const hit = this.getPointUnderMouse(canvasX, canvasY);
      const pathHit = this.getPathUnderMouse(canvasX, canvasY);
      canvas.style.cursor = hit ? 'grab' : (pathHit !== null ? 'pointer' : 'crosshair');
      return false; // Not handled, allow coordinate display
    }
  }

  handleMouseUp(e) {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragPointIndex = -1;
      this.getCanvas().style.cursor = 'crosshair';
      return true; // Handled
    }
    return false; // Not handled
  }

  // --- Inter-Path Tangency Maintenance ---
  maintainInterPathTangency() {
    const canvas = this.getCanvas();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const currentPath = this.getCurrentPath();
    const currentPoints = currentPath.getPoints(canvasWidth, canvasHeight);
    
    // Check for tangency maintenance across all paths when dragging control points
    this.maintainAllPathTangencies();
    
    // Check if the dragged point is the first point of a path (except path 0)
    if (this.activePathIndex > 0 && this.dragPointIndex === 0) {
      // Find the previous path's last point and check if paths are actually connected
      const prevPath = this.paths[this.activePathIndex - 1];
      if (prevPath) {
        const lastPoint = prevPath.getLastPoint(canvasWidth, canvasHeight);
        const secondToLastPoint = prevPath.getSecondToLastPoint(canvasWidth, canvasHeight);
        
        // Only maintain tangency if the paths are actually connected (first point matches last point)
        const tolerance = 5; // pixels
        const isConnected = lastPoint && 
          Math.abs(currentPoints[0].x - lastPoint.x) < tolerance &&
          Math.abs(currentPoints[0].y - lastPoint.y) < tolerance;
        
        if (isConnected && secondToLastPoint && currentPoints.length > 1) {
          const direction = {
            x: lastPoint.x - secondToLastPoint.x,
            y: lastPoint.y - secondToLastPoint.y
          };
          const newControlX = currentPoints[0].x + direction.x;
          const newControlY = currentPoints[0].y + direction.y;
          currentPath.setPoint(1, newControlX, newControlY, canvasWidth, canvasHeight);
        }
      }
    }
    
    // Check if the dragged point is the last control point of a path
    if (this.dragPointIndex === currentPoints.length - 2 && this.activePathIndex < this.paths.length - 1) {
      const nextPath = this.paths[this.activePathIndex + 1];
      if (nextPath) {
        const nextPoints = nextPath.getPoints(canvasWidth, canvasHeight);
        const lastPoint = currentPoints[currentPoints.length - 1];
        
        // Only maintain tangency if the paths are actually connected
        const tolerance = 5; // pixels
        const isConnected = nextPoints.length > 0 &&
          Math.abs(nextPoints[0].x - lastPoint.x) < tolerance &&
          Math.abs(nextPoints[0].y - lastPoint.y) < tolerance;
        
        if (isConnected && nextPoints.length > 1) {
          const draggedPoint = currentPoints[this.dragPointIndex];
          
          // Update the next path's first control point to maintain tangency
          const direction = {
            x: lastPoint.x - draggedPoint.x,
            y: lastPoint.y - draggedPoint.y
          };
          const newControlX = nextPoints[0].x + direction.x;
          const newControlY = nextPoints[0].y + direction.y;
          nextPath.setPoint(1, newControlX, newControlY, canvasWidth, canvasHeight);
        }
      }
    }
    
    // Check if the dragged point is the last point of a path
    if (this.dragPointIndex === currentPoints.length - 1 && this.activePathIndex < this.paths.length - 1) {
      const nextPath = this.paths[this.activePathIndex + 1];
      if (nextPath) {
        const nextPoints = nextPath.getPoints(canvasWidth, canvasHeight);
        
        // Only move the next path's first point if they are actually connected
        const tolerance = 5; // pixels
        const isConnected = nextPoints.length > 0 &&
          Math.abs(nextPoints[0].x - currentPoints[this.dragPointIndex].x) < tolerance &&
          Math.abs(nextPoints[0].y - currentPoints[this.dragPointIndex].y) < tolerance;
        
        if (isConnected) {
          // Move the next path's first point to match
          nextPath.setPoint(0, currentPoints[this.dragPointIndex].x, currentPoints[this.dragPointIndex].y, canvasWidth, canvasHeight);
        }
      }
    }
  }

  // --- Comprehensive Tangency Maintenance ---
  maintainAllPathTangencies() {
    const tolerance = 5; // pixels for connection detection
    const canvas = this.getCanvas();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const currentPath = this.getCurrentPath();
    const currentPoints = currentPath.getPoints(canvasWidth, canvasHeight);
    const draggedPoint = currentPoints[this.dragPointIndex];
    
    // Find all intersection points between path segments
    for (let pathIdx = 0; pathIdx < this.paths.length; pathIdx++) {
      const path = this.paths[pathIdx];
      const points = path.getPoints(canvasWidth, canvasHeight);
      
      // Check each point in this path for intersections with other paths
      for (let pointIdx = 0; pointIdx < points.length; pointIdx++) {
        const point = points[pointIdx];
        
        // Skip if this is the point we're currently dragging
        if (pathIdx === this.activePathIndex && pointIdx === this.dragPointIndex) {
          continue;
        }
        
        // Check if this point intersects with the dragged point
        if (Math.abs(point.x - draggedPoint.x) < tolerance && 
            Math.abs(point.y - draggedPoint.y) < tolerance) {
          
          // Found an intersection - maintain tangency
          this.maintainTangencyAtIntersection(
            { pathIndex: this.activePathIndex, pointIndex: this.dragPointIndex },
            { pathIndex: pathIdx, pointIndex: pointIdx }
          );
        }
        
        // Also check for intersections between all other paths
        for (let otherPathIdx = pathIdx + 1; otherPathIdx < this.paths.length; otherPathIdx++) {
          const otherPath = this.paths[otherPathIdx];
          const otherPoints = otherPath.getPoints(canvasWidth, canvasHeight);
          
          for (let otherPointIdx = 0; otherPointIdx < otherPoints.length; otherPointIdx++) {
            const otherPoint = otherPoints[otherPointIdx];
            
            // Check if these two points from different paths intersect
            if (Math.abs(point.x - otherPoint.x) < tolerance && 
                Math.abs(point.y - otherPoint.y) < tolerance) {
              
              // If one of these points is affected by our drag, maintain tangency
              if ((pathIdx === this.activePathIndex && this.isPointAffectedByDrag(pointIdx)) ||
                  (otherPathIdx === this.activePathIndex && this.isPointAffectedByDrag(otherPointIdx))) {
                
                this.maintainTangencyAtIntersection(
                  { pathIndex: pathIdx, pointIndex: pointIdx },
                  { pathIndex: otherPathIdx, pointIndex: otherPointIdx }
                );
              }
            }
          }
        }
      }
    }
  }

  // Check if a point is affected by the current drag operation
  isPointAffectedByDrag(pointIndex) {
    // The dragged point itself
    if (pointIndex === this.dragPointIndex) {
      return true;
    }
    
    // Points that are automatically moved due to C1 continuity
    const currentPath = this.getCurrentPath();
    const rawPoints = currentPath.getRawPoints();
    
    // If dragging an anchor point, the adjacent control points are affected
    if (this.dragPointIndex % 3 === 0 && this.dragPointIndex > 0 && this.dragPointIndex < rawPoints.length - 1) {
      const anchorIdx = this.dragPointIndex;
      const handleBeforeIdx = anchorIdx - 1;
      const handleAfterIdx = anchorIdx + 1;
      if (pointIndex === handleBeforeIdx || pointIndex === handleAfterIdx) {
        return true;
      }
    }
    
    // If dragging a control handle, the reflected handle is affected
    if (this.dragPointIndex % 3 === 1 && this.dragPointIndex > 1) {
      const joinIdx = this.dragPointIndex;
      const handleBeforeIdx = joinIdx - 2;
      if (pointIndex === handleBeforeIdx) {
        return true;
      }
    }
    
    if (this.dragPointIndex % 3 === 2 && this.dragPointIndex > 1) {
      const handleBeforeIdx = this.dragPointIndex;
      const anchorIdx = handleBeforeIdx + 1;
      const handleAfterIdx = anchorIdx + 1;
      if (pointIndex === handleAfterIdx) {
        return true;
      }
    }
    
    return false;
  }

  // Maintain tangency at a specific intersection point
  maintainTangencyAtIntersection(point1, point2) {
    const path1 = this.paths[point1.pathIndex];
    const path2 = this.paths[point2.pathIndex];
    const points1 = path1.getPoints();
    const points2 = path2.getPoints();
    
    // Determine which point is an anchor (end/start of segment) and which are controls
    const info1 = this.getPointInfo(point1.pathIndex, point1.pointIndex);
    const info2 = this.getPointInfo(point2.pathIndex, point2.pointIndex);
    
    // If both points are anchors at an intersection, maintain tangency
    if (info1.isAnchor && info2.isAnchor) {
      this.maintainAnchorTangency(point1, point2, info1, info2);
    }
    // If one is an anchor and one is a control, maintain their relationship
    else if (info1.isAnchor && !info2.isAnchor) {
      this.maintainAnchorControlTangency(point1, point2, info1, info2);
    }
    else if (!info1.isAnchor && info2.isAnchor) {
      this.maintainAnchorControlTangency(point2, point1, info2, info1);
    }
  }

  // Get information about a point's role in the curve
  getPointInfo(pathIndex, pointIndex) {
    const path = this.paths[pathIndex];
    const points = path.getPoints();
    
    // First and last points are always anchors
    if (pointIndex === 0 || pointIndex === points.length - 1) {
      return { 
        isAnchor: true, 
        isFirst: pointIndex === 0,
        isLast: pointIndex === points.length - 1,
        segmentStart: pointIndex === 0 ? 0 : Math.floor((pointIndex - 1) / 3) * 3,
        segmentEnd: pointIndex === points.length - 1 ? points.length - 1 : Math.floor((pointIndex - 1) / 3) * 3 + 3
      };
    }
    
    // Points at positions 3, 6, 9, etc. are anchors (end of segments)
    if ((pointIndex - 3) % 3 === 0) {
      return { 
        isAnchor: true,
        isFirst: false,
        isLast: false,
        segmentStart: pointIndex - 3,
        segmentEnd: pointIndex
      };
    }
    
    // All other points are control points
    return { 
      isAnchor: false,
      isControl: true,
      controlType: pointIndex % 3 === 1 ? 'after' : 'before'
    };
  }

  // Maintain tangency between two anchor points
  maintainAnchorTangency(anchor1, anchor2, info1, info2) {
    const path1 = this.paths[anchor1.pathIndex];
    const path2 = this.paths[anchor2.pathIndex];
    const points1 = path1.getPoints();
    const points2 = path2.getPoints();
    
    // Get the control points adjacent to each anchor
    const controls1 = this.getAdjacentControls(anchor1.pathIndex, anchor1.pointIndex);
    const controls2 = this.getAdjacentControls(anchor2.pathIndex, anchor2.pointIndex);
    
    // If we're dragging a control point that affects one of these anchors,
    // update the corresponding control point on the other path
    if (anchor1.pathIndex === this.activePathIndex && controls1.length > 0) {
      this.updateCorrespondingControls(controls1, controls2, points1, points2);
    } else if (anchor2.pathIndex === this.activePathIndex && controls2.length > 0) {
      this.updateCorrespondingControls(controls2, controls1, points2, points1);
    }
  }

  // Maintain tangency between an anchor and a control point
  maintainAnchorControlTangency(anchor, control, anchorInfo, controlInfo) {
    // This handles cases where a control point intersects with an anchor point
    // In most practical cases, this would be handled by the anchor-anchor case
    // but this provides additional robustness
  }

  // Get control points adjacent to an anchor
  getAdjacentControls(pathIndex, anchorIndex) {
    const path = this.paths[pathIndex];
    const points = path.getPoints();
    const controls = [];
    
    // Control before the anchor
    if (anchorIndex > 0) {
      controls.push({ index: anchorIndex - 1, type: 'before' });
    }
    
    // Control after the anchor
    if (anchorIndex < points.length - 1) {
      controls.push({ index: anchorIndex + 1, type: 'after' });
    }
    
    return controls;
  }

  // Update corresponding control points to maintain tangency
  updateCorrespondingControls(sourceControls, targetControls, sourcePoints, targetPoints) {
    if (sourceControls.length === 0 || targetControls.length === 0) {
      return;
    }
    
    // Find the anchor point that these controls are relative to
    const sourceAnchorIdx = sourceControls[0].type === 'before' ? 
      sourceControls[0].index + 1 : sourceControls[0].index - 1;
    const targetAnchorIdx = targetControls[0].type === 'before' ? 
      targetControls[0].index + 1 : targetControls[0].index - 1;
    
    if (sourceAnchorIdx < 0 || sourceAnchorIdx >= sourcePoints.length ||
        targetAnchorIdx < 0 || targetAnchorIdx >= targetPoints.length) {
      return;
    }
    
    const sourceAnchor = sourcePoints[sourceAnchorIdx];
    const targetAnchor = targetPoints[targetAnchorIdx];
    
    // For each corresponding control pair
    for (let i = 0; i < Math.min(sourceControls.length, targetControls.length); i++) {
      const sourceControl = sourceControls[i];
      const targetControl = targetControls[i];
      
      // Only update if the control types are compatible for tangency
      if ((sourceControl.type === 'before' && targetControl.type === 'after') ||
          (sourceControl.type === 'after' && targetControl.type === 'before')) {
        
        const sourceControlPoint = sourcePoints[sourceControl.index];
        const targetControlPoint = targetPoints[targetControl.index];
        
        // Calculate the direction vector from anchor to source control
        const direction = {
          x: sourceControlPoint.x - sourceAnchor.x,
          y: sourceControlPoint.y - sourceAnchor.y
        };
        
        // Calculate the length of the target control handle
        const targetLength = Math.sqrt(
          (targetControlPoint.x - targetAnchor.x) ** 2 + 
          (targetControlPoint.y - targetAnchor.y) ** 2
        );
        
        // Normalize the direction vector
        const dirLength = Math.sqrt(direction.x ** 2 + direction.y ** 2);
        if (dirLength > 0) {
          const normalizedDir = {
            x: direction.x / dirLength,
            y: direction.y / dirLength
          };
          
          // Apply the direction to the target control, but potentially in reverse
          // depending on the control type relationship
          const multiplier = sourceControl.type === targetControl.type ? 1 : -1;
          
          targetControlPoint.x = targetAnchor.x + multiplier * normalizedDir.x * targetLength;
          targetControlPoint.y = targetAnchor.y + multiplier * normalizedDir.y * targetLength;
        }
      }
    }
  }

  // --- Path Management ---
  clearPaths() {
    this.paths = [new BezierPath(0.2, 0.2)];
    this.paths[0].setColor('hsl(0, 70%, 40%)');
    this.activePathIndex = 0;
  }

  addNewPath() {
    // Create a new path and insert it at index [activePathIndex + 1]
    const insertIndex = this.activePathIndex + 1;
    
    // Create a new path with a default position offset to avoid overlap (normalized coordinates)
    const offset = insertIndex * 0.1; // 10% offset for each new path
    const baseX = 0.2 + offset;
    const baseY = 0.2 + offset;
    
    const newPath = new BezierPath(baseX, baseY);
    
    // Generate a new color
    const hue = (insertIndex * 67) % 360;
    const newColor = `hsl(${hue}, 70%, 40%)`;
    newPath.setColor(newColor);
    
    // Insert the new path at the specified position
    this.paths.splice(insertIndex, 0, newPath);
    
    // Set the new path as active
    this.activePathIndex = insertIndex;
  }

  deleteLastSection() {
    const currentPath = this.getCurrentPath();
    return currentPath.deleteLastSection();
  }

  deleteCurrentPath() {
    if (this.paths.length === 0) {
      return;
    }
    this.paths.splice(this.activePathIndex, 1);
    
    if (this.paths.length === 0) {
      // If all paths deleted, add a new one
      this.paths.push(new BezierPath(0.2, 0.2));
      this.paths[0].setColor('hsl(0, 70%, 40%)');
      this.activePathIndex = 0;
    } else {
      // Select previous path if possible, else first
      this.activePathIndex = Math.max(0, this.activePathIndex - 1);
    }
  }

  // --- Export ---
  exportPath() {
    // Export only the current selected path
    const canvas = this.getCanvas();
    const currentPath = this.getCurrentPath();
    const points = currentPath.getPoints(canvas.width, canvas.height);
    let output = '';
    
    for (let i = 0; i <= points.length - 4; i += 3) {
      // Convert to field coordinates with 1 decimal place
      const p0 = this.canvasToFieldCoords(points[i].x, points[i].y);
      const p1 = this.canvasToFieldCoords(points[i + 1].x, points[i + 1].y);
      const p2 = this.canvasToFieldCoords(points[i + 2].x, points[i + 2].y);
      const p3 = this.canvasToFieldCoords(points[i + 3].x, points[i + 3].y);
      
      if (i === 0) {
        // First segment of the path
        output += `Path p${this.activePathIndex}(${p0.x.toFixed(1)},${p0.y.toFixed(1)}, ${p1.x.toFixed(1)},${p1.y.toFixed(1)}, ${p2.x.toFixed(1)},${p2.y.toFixed(1)}, ${p3.x.toFixed(1)},${p3.y.toFixed(1)});\n`;
      } else {
        // Additional segments within the path
        output += `p${this.activePathIndex} += Path(${p0.x.toFixed(1)},${p0.y.toFixed(1)}, ${p1.x.toFixed(1)},${p1.y.toFixed(1)}, ${p2.x.toFixed(1)},${p2.y.toFixed(1)}, ${p3.x.toFixed(1)},${p3.y.toFixed(1)});\n`;
      }
    }
    
    // Copy to clipboard
    navigator.clipboard.writeText(output).then(() => {
      alert(`Path ${this.activePathIndex} copied to clipboard!`);
    }, () => {
      alert('Failed to copy path to clipboard.');
    });
  }

  getPathCount() {
    return this.paths.length;
  }

  getActivePathIndex() {
    return this.activePathIndex;
  }

  addPathSegment() {
    const canvas = this.getCanvas();
    const currentPath = this.getCurrentPath();
    
    // Add a new full Bezier segment (3 points) extending from the last point of the current path
    const rawPoints = currentPath.getRawPoints();
    if (rawPoints.length > 0) {
      const lastPoint = rawPoints[rawPoints.length - 1];
      const secondToLastPoint = rawPoints.length > 1 ? rawPoints[rawPoints.length - 2] : null;
      
      // Calculate direction for C1 continuity if we have a previous control point
      let direction = { x: 0.2, y: 0 }; // Default direction (right)
      if (secondToLastPoint) {
        direction = {
          x: lastPoint.x - secondToLastPoint.x,
          y: lastPoint.y - secondToLastPoint.y
        };
        // Normalize and scale the direction
        const length = Math.sqrt(direction.x ** 2 + direction.y ** 2);
        if (length > 0) {
          direction.x = (direction.x / length) * 0.1; // Scale to reasonable size
          direction.y = (direction.y / length) * 0.1;
        }
      }
      
      // Add the three points for a complete Bezier segment
      // First control point (maintains C1 continuity)
      currentPath.points.push({
        x: lastPoint.x + direction.x,
        y: lastPoint.y + direction.y
      });
      
      // Second control point
      currentPath.points.push({
        x: lastPoint.x + 0.15,
        y: lastPoint.y + 0.05
      });
      
      // New anchor point
      currentPath.points.push({
        x: lastPoint.x + 0.2,
        y: lastPoint.y + 0.1
      });
    }
  }
}
