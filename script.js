const DEFAULT_SIZE = 250;

        const mainCanvas = document.getElementById('mainCanvas');
        const overlayCanvas = document.getElementById('overlayCanvas');
        const colorPicker = document.getElementById('colorPicker');
        const hexInput = document.getElementById('hexInput');
        const swatch = document.getElementById('swatch');
        const canvasWidthInput = document.getElementById('canvasWidth');
        const canvasHeightInput = document.getElementById('canvasHeight');
        const resizeBtn = document.getElementById('resizeBtn');
        const toolButtons = document.querySelectorAll('.tool');
        const activeToolLabel = document.getElementById('activeTool');
        const sizeReadout = document.getElementById('sizeReadout');
        const zoomRange = document.getElementById('zoom');
        const zoomVal = document.getElementById('zoomVal');
        const fillShapes = document.getElementById('fillShapes');
        const exportBtn = document.getElementById('exportBtn');
        const clearBtn = document.getElementById('clearBtn');
        const strokeWidthSlider = document.getElementById('strokeWidth');
        const strokeWidthVal = document.getElementById('strokeWidthVal');

        let state = {
            tool: 'pencil',
            color: '#000000',
            width: DEFAULT_SIZE,
            height: DEFAULT_SIZE,
            zoom: Number(zoomRange.value),
            drawing: false,
            start: null,
            imgData: null,
            strokeWidth: Number(strokeWidthSlider ? strokeWidthSlider.value : 1)
        };

        let undoStack = [];
        let redoStack = [];

        let lastTool = 'pencil'; // default

        // stroke width UI
        strokeWidthSlider.addEventListener('input', () => {
            state.strokeWidth = Number(strokeWidthSlider.value);
            strokeWidthVal.textContent = state.strokeWidth + ' px';
        });
        strokeWidthVal.textContent = state.strokeWidth + ' px';

        canvasWidthInput.value = DEFAULT_SIZE;
        canvasHeightInput.value = DEFAULT_SIZE;
        zoomVal.textContent = state.zoom + '×';

        initCanvas(DEFAULT_SIZE, DEFAULT_SIZE);

        function initCanvas(width = DEFAULT_SIZE, height = DEFAULT_SIZE, keepImage = false) {
            mainCanvas.width = width;
            mainCanvas.height = height;
            overlayCanvas.width = width;
            overlayCanvas.height = height;

            state.width = width;
            state.height = height;

            const scale = state.zoom;
            mainCanvas.style.width = (width * scale) + 'px';
            mainCanvas.style.height = (height * scale) + 'px';
            overlayCanvas.style.width = (width * scale) + 'px';
            overlayCanvas.style.height = (height * scale) + 'px';

            const ctx = mainCanvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;

            if (!keepImage) {
                ctx.clearRect(0, 0, width, height);
                state.imgData = ctx.getImageData(0, 0, width, height);
            } else {
                const newData = ctx.createImageData(width, height);
                if (state.imgData) {
                    const old = state.imgData;
                    const minW = Math.min(old.width, newData.width);
                    const minH = Math.min(old.height, newData.height);
                    for (let y = 0; y < minH; y++) {
                        for (let x = 0; x < minW; x++) {
                            const iOld = (y * old.width + x) * 4;
                            const iNew = (y * newData.width + x) * 4;
                            newData.data[iNew] = old.data[iOld];
                            newData.data[iNew + 1] = old.data[iOld + 1];
                            newData.data[iNew + 2] = old.data[iOld + 2];
                            newData.data[iNew + 3] = old.data[iOld + 3];
                        }
                    }
                }
                state.imgData = newData;
                ctx.putImageData(state.imgData, 0, 0);
            }

            overlayCanvas.getContext('2d').clearRect(0, 0, width, height);

            drawGridOverlay();
            updateReadout();
        }

        function updateReadout() {
            sizeReadout.textContent = `${mainCanvas.width} × ${mainCanvas.height}`;
            activeToolLabel.textContent = capitalize(state.tool);
        }

        function setTool(toolName) {
            // Remember previous tool only when switching TO eyedropper
            if (toolName === 'eyedropper' && state.tool !== 'eyedropper') {
                lastTool = state.tool;
            }
            state.tool = toolName;
            toolButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tool === toolName));
            updateReadout();
        }

        function hexToRGBA(hex) {
            hex = hex.replace('#', '');
            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
            const n = parseInt(hex, 16);
            return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
        }

        function rgbaToHex(r, g, b) {
            return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
        }

        function setColor(hex) {
            state.color = hex;
            swatch.style.background = hex;
            hexInput.value = hex;
            colorPicker.value = hex;
        }

        function saveState() {
            undoStack.push(mainCanvas.getContext('2d').getImageData(0, 0, mainCanvas.width, mainCanvas.height));
            redoStack = [];
        }

        function undo() {
            if (undoStack.length > 0) {
                redoStack.push(mainCanvas.getContext('2d').getImageData(0, 0, mainCanvas.width, mainCanvas.height));
                const prev = undoStack.pop();
                mainCanvas.getContext('2d').putImageData(prev, 0, 0);
                state.imgData = mainCanvas.getContext('2d').getImageData(0, 0, mainCanvas.width, mainCanvas.height);
                redrawMain();
            }
        }

        function redo() {
            if (redoStack.length > 0) {
                undoStack.push(mainCanvas.getContext('2d').getImageData(0, 0, mainCanvas.width, mainCanvas.height));
                const next = redoStack.pop();
                mainCanvas.getContext('2d').putImageData(next, 0, 0);
                state.imgData = mainCanvas.getContext('2d').getImageData(0, 0, mainCanvas.width, mainCanvas.height);
                redrawMain();
            }
        }

        document.getElementById('undoBtn').addEventListener('click', undo);
        document.getElementById('redoBtn').addEventListener('click', redo);

        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') undo();
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') redo();
        });

        colorPicker.addEventListener('input', e => setColor(e.target.value));
        hexInput.addEventListener('change', e => {
            let v = e.target.value.trim();
            if (!v.startsWith('#')) v = '#' + v;
            if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) {
                setColor(v);
            } else {
                e.target.value = state.color;
            }
        });

        toolButtons.forEach(btn => btn.addEventListener('click', () => setTool(btn.dataset.tool)));

        setTool('pencil');
        setColor('#000000');

        zoomRange.addEventListener('input', () => {
            state.zoom = Number(zoomRange.value);
            zoomVal.textContent = state.zoom + '×';
            mainCanvas.style.width = (mainCanvas.width * state.zoom) + 'px';
            mainCanvas.style.height = (mainCanvas.height * state.zoom) + 'px';
            overlayCanvas.style.width = (overlayCanvas.width * state.zoom) + 'px';
            overlayCanvas.style.height = (overlayCanvas.height * state.zoom) + 'px';
            drawGridOverlay();
        });

        resizeBtn.addEventListener('click', () => {
            const newWidth = Math.max(5, Math.min(1024, Number(canvasWidthInput.value || DEFAULT_SIZE)));
            const newHeight = Math.max(5, Math.min(1024, Number(canvasHeightInput.value || DEFAULT_SIZE)));
            if (newWidth === mainCanvas.width && newHeight === mainCanvas.height) return;
            const keep = confirm('Keep current drawing contents where possible when resizing? Click Cancel to start fresh.');
            initCanvas(newWidth, newHeight, keep);
            state.width = newWidth;
            state.height = newHeight;
        });

        clearBtn.addEventListener('click', () => {
            if (confirm('Clear the canvas?')) {
                const ctx = mainCanvas.getContext('2d');
                ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
                state.imgData = ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
                drawGridOverlay();
            }
        });

        exportBtn.addEventListener('click', () => {
            let scale = parseInt(prompt('Export scale (pixels per grid cell). 1 = exact size. For a larger image use e.g. 10.', '10'));
            if (isNaN(scale) || scale < 1) scale = 1;
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = mainCanvas.width * scale;
            exportCanvas.height = mainCanvas.height * scale;
            const exCtx = exportCanvas.getContext('2d');
            exCtx.imageSmoothingEnabled = false;

            const tmp = document.createElement('canvas');
            tmp.width = mainCanvas.width;
            tmp.height = mainCanvas.height;
            const tctx = tmp.getContext('2d');
            tctx.putImageData(state.imgData, 0, 0);

            exCtx.drawImage(tmp, 0, 0, exportCanvas.width, exportCanvas.height);

            exportCanvas.toBlob(blob => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `pixel-art-${mainCanvas.width}x${mainCanvas.height}x${scale}.png`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            }, 'image/png');
        });

        function getPointerPixel(e, canvas) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.clientX !== undefined ? e.clientX : e.touches && e.touches[0].clientX;
            const clientY = e.clientY !== undefined ? e.clientY : e.touches && e.touches[0].clientY;
            const x = Math.floor(((clientX - rect.left) / rect.width) * canvas.width);
            const y = Math.floor(((clientY - rect.top) / rect.height) * canvas.height);
            return { x: clamp(x, 0, canvas.width - 1), y: clamp(y, 0, canvas.height - 1) };
        }

        function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

        function setPixel(x, y, rgba) {
            if (x < 0 || x >= state.imgData.width || y < 0 || y >= state.imgData.height) return;
            const idx = (y * state.imgData.width + x) * 4;
            state.imgData.data[idx] = rgba[0];
            state.imgData.data[idx + 1] = rgba[1];
            state.imgData.data[idx + 2] = rgba[2];
            state.imgData.data[idx + 3] = rgba[3] !== undefined ? rgba[3] : 255;
        }

        function getPixelRGBA(x, y) {
            const idx = (y * state.imgData.width + x) * 4;
            return [
                state.imgData.data[idx],
                state.imgData.data[idx + 1],
                state.imgData.data[idx + 2],
                state.imgData.data[idx + 3]
            ];
        }

        function redrawMain() {
            const ctx = mainCanvas.getContext('2d');
            ctx.putImageData(state.imgData, 0, 0);
        }

        // Draw a filled circle at (cx, cy) with radius, into imgData
        function drawCirclePixels(cx, cy, radius, colorRGBA) {
            const r2 = radius * radius;
            const xMin = Math.floor(cx - radius), xMax = Math.ceil(cx + radius);
            const yMin = Math.floor(cy - radius), yMax = Math.ceil(cy + radius);
            for (let y = yMin; y <= yMax; y++) {
                for (let x = xMin; x <= xMax; x++) {
                    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2) {
                        setPixel(x, y, colorRGBA);
                    }
                }
            }
        }

        // Bresenham line, but draw a circle at each pixel for stroke width
        function drawLinePixels(x0, y0, x1, y1, colorRGBA, strokeWidth = 1) {
            let dx = Math.abs(x1 - x0);
            let sx = x0 < x1 ? 1 : -1;
            let dy = -Math.abs(y1 - y0);
            let sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;
            while (true) {
                drawCirclePixels(x0, y0, strokeWidth / 2, colorRGBA);
                if (x0 === x1 && y0 === y1) break;
                let e2 = 2 * err;
                if (e2 >= dy) { err += dy; x0 += sx; }
                if (e2 <= dx) { err += dx; y0 += sy; }
            }
        }

        // Draw filled or bordered rectangle with borderWidth
        function drawRectPixels(x0, y0, x1, y1, colorRGBA, filled = true, borderWidth = 1) {
            const xMin = Math.min(x0, x1), xMax = Math.max(x0, x1);
            const yMin = Math.min(y0, y1), yMax = Math.max(y0, y1);
            if (filled) {
                for (let y = yMin; y <= yMax; y++) {
                    for (let x = xMin; x <= xMax; x++) {
                        setPixel(x, y, colorRGBA);
                    }
                }
            } else {
                // Draw border of thickness borderWidth
                for (let w = 0; w < borderWidth; w++) {
                    // Top
                    for (let x = xMin + w; x <= xMax - w; x++) setPixel(x, yMin + w, colorRGBA);
                    // Bottom
                    for (let x = xMin + w; x <= xMax - w; x++) setPixel(x, yMax - w, colorRGBA);
                    // Left
                    for (let y = yMin + w; y <= yMax - w; y++) setPixel(xMin + w, y, colorRGBA);
                    // Right
                    for (let y = yMin + w; y <= yMax - w; y++) setPixel(xMax - w, y, colorRGBA);
                }
            }
        }

        // Draw filled or bordered ellipse with borderWidth
        function drawEllipsePixels(x0, y0, x1, y1, colorRGBA, filled = true, borderWidth = 1) {
            const cx = (x0 + x1) / 2;
            const cy = (y0 + y1) / 2;
            const rx = Math.abs(x1 - x0) / 2;
            const ry = Math.abs(y1 - y0) / 2;
            if (rx < 0.5 || ry < 0.5) {
                setPixel(Math.round(cx), Math.round(cy), colorRGBA);
                return;
            }
            const xMin = Math.floor(cx - rx), xMax = Math.ceil(cx + rx);
            const yMin = Math.floor(cy - ry), yMax = Math.ceil(cy + ry);
            const invRx2 = 1 / (rx * rx), invRy2 = 1 / (ry * ry);

            if (filled) {
                for (let y = yMin; y <= yMax; y++) {
                    for (let x = xMin; x <= xMax; x++) {
                        const dx = (x - cx), dy = (y - cy);
                        const val = (dx * dx) * invRx2 + (dy * dy) * invRy2;
                        if (val <= 1) setPixel(x, y, colorRGBA);
                    }
                }
            } else {
                // Border: draw pixels where val is within the band corresponding to borderWidth
                // The thickness in radius for borderWidth is: borderWidth/2 inwards, borderWidth/2 outwards
                // Since val = 1 is the edge, we want val in [1 - inner, 1 + outer]
                // Approximate pixel width band for val:
                // Use bandWidth = borderWidth / Math.max(rx, ry)
                const bandWidth = borderWidth / Math.max(rx, ry);
                for (let y = yMin; y <= yMax; y++) {
                    for (let x = xMin; x <= xMax; x++) {
                        const dx = (x - cx), dy = (y - cy);
                        const val = (dx * dx) * invRx2 + (dy * dy) * invRy2;
                        if (Math.abs(val - 1) <= bandWidth / 2) {
                            setPixel(x, y, colorRGBA);
                        }
                    }
                }
            }
        }

        function floodFill(sx, sy, targetRGBA, replacementRGBA) {
            const w = state.imgData.width, h = state.imgData.height;
            if (targetRGBA[0] === replacementRGBA[0] && targetRGBA[1] === replacementRGBA[1] && targetRGBA[2] === replacementRGBA[2] && targetRGBA[3] === replacementRGBA[3]) return;
            function same(x, y, rgba) {
                const p = getPixelRGBA(x, y);
                return p[0] === rgba[0] && p[1] === rgba[1] && p[2] === rgba[2] && p[3] === rgba[3];
            }
            const stack = [[sx, sy]];
            while (stack.length) {
                const [x, y] = stack.pop();
                if (x < 0 || x >= w || y < 0 || y >= h) continue;
                if (!same(x, y, targetRGBA)) continue;
                setPixel(x, y, replacementRGBA);
                stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
            }
        }

        function clearOverlay() { overlayCanvas.getContext('2d').clearRect(0, 0, overlayCanvas.width, overlayCanvas.height); }

        // Overlay previews. They use 1px wide always for visual preview.
        function drawOverlayLine(x0, y0, x1, y1, strokeWidth = 1) {
            const ctx = overlayCanvas.getContext('2d');
            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            ctx.fillStyle = hexToCSS(state.color);

            let dx = Math.abs(x1 - x0);
            let sx = x0 < x1 ? 1 : -1;
            let dy = -Math.abs(y1 - y0);
            let sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;
            while (true) {
                drawOverlayCircle(ctx, x0, y0, strokeWidth / 2);
                if (x0 === x1 && y0 === y1) break;
                let e2 = 2 * err;
                if (e2 >= dy) { err += dy; x0 += sx; }
                if (e2 <= dx) { err += dx; y0 += sy; }
            }
        }

        // Helper for drawing a filled circle on overlay
        function drawOverlayCircle(ctx, cx, cy, radius) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
            ctx.fill();
        }

        function drawOverlayRect(x0, y0, x1, y1, filled, borderWidth = 1) {
            const ctx = overlayCanvas.getContext('2d');
            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            ctx.fillStyle = hexToCSS(state.color);
            const xMin = Math.min(x0, x1), xMax = Math.max(x0, x1);
            const yMin = Math.min(y0, y1), yMax = Math.max(y0, y1);
            if (filled) ctx.fillRect(xMin, yMin, xMax - xMin + 1, yMax - yMin + 1);
            else {
                for (let w = 0; w < borderWidth; w++) {
                    // Top
                    ctx.fillRect(xMin + w, yMin + w, xMax - xMin + 1 - 2 * w, 1);
                    // Bottom
                    ctx.fillRect(xMin + w, yMax - w, xMax - xMin + 1 - 2 * w, 1);
                    // Left
                    ctx.fillRect(xMin + w, yMin + w, 1, yMax - yMin + 1 - 2 * w);
                    // Right
                    ctx.fillRect(xMax - w, yMin + w, 1, yMax - yMin + 1 - 2 * w);
                }
            }
        }

        function drawOverlayOval(x0, y0, x1, y1, filled, borderWidth = 1) {
            const ctx = overlayCanvas.getContext('2d');
            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            ctx.fillStyle = hexToCSS(state.color);
            const cx = (x0 + x1) / 2;
            const cy = (y0 + y1) / 2;
            const rx = Math.abs(x1 - x0) / 2;
            const ry = Math.abs(y1 - y0) / 2;
            if (rx < 0.5 || ry < 0.5) {
                ctx.fillRect(Math.round(cx), Math.round(cy), 1, 1);
                return;
            }
            const xMin = Math.floor(cx - rx), xMax = Math.ceil(cx + rx);
            const yMin = Math.floor(cy - ry), yMax = Math.ceil(cy + ry);
            const invRx2 = 1 / (rx * rx), invRy2 = 1 / (ry * ry);
            if (filled) {
                for (let y = yMin; y <= yMax; y++) {
                    for (let x = xMin; x <= xMax; x++) {
                        const dx = (x - cx), dy = (y - cy);
                        const val = (dx * dx) * invRx2 + (dy * dy) * invRy2;
                        if (val <= 1) ctx.fillRect(x, y, 1, 1);
                    }
                }
            } else {
                const bandWidth = borderWidth / Math.max(rx, ry);
                for (let y = yMin; y <= yMax; y++) {
                    for (let x = xMin; x <= xMax; x++) {
                        const dx = (x - cx), dy = (y - cy);
                        const val = (dx * dx) * invRx2 + (dy * dy) * invRy2;
                        if (Math.abs(val - 1) <= bandWidth / 2) ctx.fillRect(x, y, 1, 1);
                    }
                }
            }
        }

        function hexToCSS(hex) {
            return hex;
        }

        function drawGridOverlay() {
            const ctx = overlayCanvas.getContext('2d');
            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            const w = overlayCanvas.width, h = overlayCanvas.height;
            ctx.strokeStyle = 'rgba(0,0,0,0.08)';
            ctx.lineWidth = 0.03;
            ctx.beginPath();
            for (let x = 0; x <= w; x++) {
                ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h);
            }
            for (let y = 0; y <= h; y++) {
                ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5);
            }
            ctx.stroke();
        }

        let lastPos = null;

        function onPointerDown(e) {
            e.preventDefault();
            const p = getPointerPixel(e, mainCanvas);
            state.drawing = true;
            state.start = { x: p.x, y: p.y };
            lastPos = { x: p.x, y: p.y };

            if (['pencil', 'eraser', 'fill', 'line', 'rect', 'oval'].includes(state.tool)) {
                saveState();
            }

            if (state.tool === 'pencil') {
                const rgba = hexToRGBA(state.color);
                drawCirclePixels(p.x, p.y, state.strokeWidth / 2, rgba);
                redrawMain();
            } else if (state.tool === 'eraser') {
                const rgba = [0, 0, 0, 0];
                drawCirclePixels(p.x, p.y, state.strokeWidth / 2, rgba);
                redrawMain();
            } else if (state.tool === 'fill') {
                const target = getPixelRGBA(p.x, p.y);
                const replacement = hexToRGBA(state.color);
                floodFill(p.x, p.y, target, replacement);
                redrawMain();
            } else if (state.tool === 'eyedropper') {
                const picked = getPixelRGBA(p.x, p.y);
                const hex = rgbaToHex(picked[0], picked[1], picked[2]);
                setColor(hex);
                // switch to previous tool
                setTool(lastTool);
            } else {
                clearOverlay();
                if (state.tool === 'line') drawOverlayLine(p.x, p.y, p.x, p.y);
                if (state.tool === 'rect') drawOverlayRect(p.x, p.y, p.x, p.y, fillShapes.checked, state.strokeWidth);
                if (state.tool === 'oval') drawOverlayOval(p.x, p.y, p.x, p.y, fillShapes.checked, state.strokeWidth);
            }
        }

        function onPointerMove(e) {
            if (!state.drawing) return;
            const p = getPointerPixel(e, mainCanvas);
            if (state.tool === 'pencil') {
                const rgba = hexToRGBA(state.color);
                drawLinePixels(lastPos.x, lastPos.y, p.x, p.y, rgba, state.strokeWidth);
                lastPos = { x: p.x, y: p.y };
                redrawMain();
            } else if (state.tool === 'eraser') {
                const rgba = [0, 0, 0, 0];
                drawLinePixels(lastPos.x, lastPos.y, p.x, p.y, rgba, state.strokeWidth);
                lastPos = { x: p.x, y: p.y };
                redrawMain();
            } else if (state.tool === 'line') {
                drawOverlayLine(state.start.x, state.start.y, p.x, p.y, state.strokeWidth);
            } else if (state.tool === 'rect') {
                drawOverlayRect(state.start.x, state.start.y, p.x, p.y, fillShapes.checked, state.strokeWidth);
            } else if (state.tool === 'oval') {
                drawOverlayOval(state.start.x, state.start.y, p.x, p.y, fillShapes.checked, state.strokeWidth);
            }
        }

        function onPointerUp(e) {
            if (!state.drawing) return;
            state.drawing = false;
            const p = getPointerPixel(e, mainCanvas);
            if (state.tool === 'pencil') {
                // already drawn as we moved
            } else if (state.tool === 'eraser') {
                // already drawn as we moved
            } else if (state.tool === 'line') {
                const rgba = hexToRGBA(state.color);
                drawLinePixels(state.start.x, state.start.y, p.x, p.y, rgba, state.strokeWidth);
                redrawMain();
                clearOverlay();
            } else if (state.tool === 'rect') {
                const rgba = hexToRGBA(state.color);
                if (fillShapes.checked) {
                    drawRectPixels(state.start.x, state.start.y, p.x, p.y, rgba, true, 1);
                } else {
                    drawRectPixels(state.start.x, state.start.y, p.x, p.y, rgba, false, state.strokeWidth);
                }
                redrawMain();
                clearOverlay();
            } else if (state.tool === 'oval') {
                const rgba = hexToRGBA(state.color);
                if (fillShapes.checked) {
                    drawEllipsePixels(state.start.x, state.start.y, p.x, p.y, rgba, true, 1);
                } else {
                    drawEllipsePixels(state.start.x, state.start.y, p.x, p.y, rgba, false, state.strokeWidth);
                }
                redrawMain();
                clearOverlay();
            }
        }

        mainCanvas.addEventListener('pointerdown', onPointerDown);
        mainCanvas.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);

        overlayCanvas.addEventListener('pointerdown', onPointerDown);
        overlayCanvas.addEventListener('pointermove', onPointerMove);
        overlayCanvas.addEventListener('pointerup', onPointerUp);

        window.addEventListener('keydown', (e) => {
            if (e.key === 'p' || e.key === 'P') setTool('pencil');
            if (e.key === 'l' || e.key === 'L') setTool('line');
            if (e.key === 'r' || e.key === 'R') setTool('rect');
            if (e.key === 'o' || e.key === 'O') setTool('oval');
            if (e.key === 'f' || e.key === 'F') setTool('fill');
            if (e.key === 'i' || e.key === 'I') setTool('eyedropper');
        });

        function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
