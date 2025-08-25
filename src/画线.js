var lines = [[], [], []]
var lineOffset = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]
var lineScale = [1, 1, 1]
export function vtk画线() {
    for (let i = 0; i < 3; i++) {
        const canvas = document.getElementById('画线-canvas-' + i);
        const ctx = canvas.getContext('2d');

        let isDrawing = false;
        let startPoint = null;



        // 初始化画布
        function initCanvas() {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            updateBrushSettings();
        }

        // 更新画笔设置
        function updateBrushSettings() {
            ctx.lineWidth = document.getElementById('lineWidth').value;
            ctx.strokeStyle = document.getElementById('lineColor').value;
        }

        // 绘制所有直线


        // 获取正确的Canvas坐标（考虑缩放和偏移）
        function getCanvasPosition(clientX, clientY) {
            const rect = canvas.getBoundingClientRect();
            const x = (clientX - rect.left - lineOffset[i].x) / lineScale[i];
            const y = (clientY - rect.top - lineOffset[i].y) / lineScale[i];
            return { x, y };
        }

        // 鼠标事件处理
        canvas.addEventListener('mousedown', (e) => {
            const pos = getCanvasPosition(e.clientX, e.clientY);
            isDrawing = true;
            startPoint = pos;
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!isDrawing) return;

            const currentPos = getCanvasPosition(e.clientX, e.clientY);

            // 实时预览当前绘制的直线
            drawAllLines(i);
            ctx.save();
            ctx.translate(lineOffset[i].x, lineOffset[i].y);
            ctx.scale(lineScale[i], lineScale[i]);

            ctx.beginPath();
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.lineTo(currentPos.x, currentPos.y);
            ctx.strokeStyle = document.getElementById('lineColor').value;
            ctx.lineWidth = document.getElementById('lineWidth').value;
            ctx.stroke();
            ctx.restore();
        });

        canvas.addEventListener('mouseup', (e) => {
            if (!isDrawing) return;

            const endPoint = getCanvasPosition(e.clientX, e.clientY);

            lines[i].push({
                start: startPoint,
                end: endPoint,
                width: document.getElementById('lineWidth').value,
                color: document.getElementById('lineColor').value
            });

            isDrawing = false;
            startPoint = null;
            drawAllLines(i);
        });

        canvas.addEventListener('mouseleave', () => {
            if (isDrawing) {
                isDrawing = false;
                drawAllLines(i);
            }
        });


        // document.getElementById('zoomInBtn').addEventListener('click', () => {
        //     const scaleFactor = parseFloat(document.getElementById('scaleFactor').value);
        //     const prevScale = currentScale;
        //     currentScale *= scaleFactor;

        //     // 调整偏移量保持中心点
        //     const centerX = canvas.width / 2;
        //     const centerY = canvas.height / 2;
        //     offsetX = centerX - (centerX - offsetX) * (currentScale / prevScale);
        //     offsetY = centerY - (centerY - offsetY) * (currentScale / prevScale);

        //     drawAllLines();
        // });

        // document.getElementById('zoomOutBtn').addEventListener('click', () => {
        //     const scaleFactor = parseFloat(document.getElementById('scaleFactor').value);
        //     const prevScale = currentScale;
        //     currentScale /= scaleFactor;

        //     // 调整偏移量保持中心点
        //     const centerX = canvas.width / 2;
        //     const centerY = canvas.height / 2;
        //     offsetX = centerX - (centerX - offsetX) * (currentScale / prevScale);
        //     offsetY = centerY - (centerY - offsetY) * (currentScale / prevScale);

        //     drawAllLines();
        // });

        // document.getElementById('resetBtn').addEventListener('click', () => {
        //     currentScale = 1;
        //     offsetX = 0;
        //     offsetY = 0;
        //     drawAllLines();
        // });
        // 初始化
        initCanvas();
    }

}
// 平移回调
export function drawAllLines(index, moveX, moveY, scaleFactor) {
    const canvas = document.getElementById('画线-canvas-' + index);
    if (moveX || moveY) {
        lineOffset[index].x += moveX;
        lineOffset[index].y += moveY;
    }
    if (scaleFactor) {
        const prevScale = lineScale[index];
        lineScale[index] *= scaleFactor;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        lineOffset[index].x = centerX - (centerX - lineOffset[index].x) * (lineScale[index] / prevScale);
        lineOffset[index].y = centerY - (centerY - lineOffset[index].y) * (lineScale[index] / prevScale);
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(lineOffset[index].x, lineOffset[index].y);
    ctx.scale(lineScale[index], lineScale[index]);
    lines[index].forEach(line => {
        ctx.beginPath();
        ctx.moveTo(line.start.x, line.start.y);
        ctx.lineTo(line.end.x, line.end.y);
        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.width;
        ctx.stroke();
    });
    ctx.restore();
}