// 计算两点间距离（使用世界坐标）

export function calculateDistance(start, end, renderer) {
    // 转换为世界坐标
    const worldStart = screenToWorld(start, renderer);
    const worldEnd = screenToWorld(end, renderer);
    console.log("start:",start,"worldStart:",worldStart,"end:",end, ",worldEnd:",worldEnd);
    // 计算世界坐标系下的距离
    const dx = worldEnd[0] - worldStart[0];
    const dy = worldEnd[1] - worldStart[1];
    const dz = worldEnd[2] - worldStart[2];
    console.log("length:",Math.sqrt(dx * dx + dy * dy + dz * dz))
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * 屏幕坐标转换为世界坐标
 * @param {*} displayPos 屏幕坐标
 * @param {*} renderer 渲染器
 * @returns 世界坐标
 */
function screenToWorld(displayPos, renderer) {
  const coordinate = vtkCoordinate.newInstance();
  coordinate.setCoordinateSystemToDisplay();
  coordinate.setValue(displayPos.x, displayPos.y, 0);
  return coordinate.getComputedWorldValue(renderer);
}


// 存储绘制记录
let drawRecord = [];
let beishu = 1;

/**
 * Canvas和VTK之间的转换处理函数
 * @param {number} pro_type - 操作模式: 1-切图, 2-平移, 3-缩放
 * @param {Object} data - 相关操作数据
 * @param {Array} draw_record - 绘制记录数据(可选)
 * @returns {Object} 处理结果
 */
export function qn_vtk_transition(pro_type, data, draw_record) {
    // 如果提供了新的绘制记录，则更新存储
    if (draw_record) {
        drawRecord = [...draw_record];
    }
    
    switch (pro_type) {
        case 1: // 切图
            return handleSlice(data);
        case 2: // 平移
            return handleTranslate(data);
        case 3: // 缩放
            return handleScale(data);
        default:
            throw new Error('未知的操作模式');
    }
}

/**
 * 处理切图操作
 * @param {Object} data - 切图数据 {slice: 185}
 * @returns {Object} 处理结果
 */
function handleSlice(data) {
    // 切图操作不需要修改绘制记录
    return {
        success: true,
        message: `切图到 ${data.slice}`,
        draw_record: drawRecord
    };
}

/**
 * 处理平移操作
 * @param {Object} data - 平移数据 {x: 10, y: 10}
 * @returns {Object} 处理结果
 */
function handleTranslate(data) {
    // 平移操作需要更新绘制记录中的坐标
    const updatedRecord = drawRecord.map(item => {
        // 深拷贝参数对象
        const updatedParams = JSON.parse(JSON.stringify(item.参数));
        
        switch (item.形状) {
            case "画线":
                // 更新起点和终点坐标
                updatedParams[0][0] += data.x * beishu; // 起点x
                updatedParams[0][1] += data.y * beishu; // 起点y
                updatedParams[1][0] += data.x * beishu; // 终点x
                updatedParams[1][1] += data.y * beishu; // 终点y
                
                // 重新计算长度（简化处理，实际应该根据新的坐标重新计算）
                // 这里保持原长度不变，因为没有vtk渲染器上下文来正确计算
                return {
                    ...item,
                    参数: updatedParams
                };
                
            case "量角":
                // 更新三个点的坐标
                updatedParams[0][0] += data.x * beishu; // 第一条线起点x
                updatedParams[0][1] += data.y * beishu; // 第一条线起点y
                updatedParams[1][0] += data.x * beishu; // 第一条线终点x, 第二条线起点x
                updatedParams[1][1] += data.y * beishu; // 第一条线终点y, 第二条线起点y
                updatedParams[2][0] += data.x * beishu; // 第二条线终点x
                updatedParams[2][1] += data.y * beishu; // 第二条线终点y
                
                return {
                    ...item,
                    参数: updatedParams
                };
                
            case "心胸比":
                // 更新四条线的坐标
                updatedParams[0][0] += data.x * beishu; // 第一条线起点x
                updatedParams[0][1] += data.y * beishu; // 第一条线起点y
                updatedParams[1][0] += data.x * beishu; // 第一条线终点x
                updatedParams[1][1] += data.y * beishu; // 第一条线终点y
                updatedParams[3][0] += data.x * beishu; // 第二条线起点x
                updatedParams[3][1] += data.y * beishu; // 第二条线起点y
                updatedParams[4][0] += data.x * beishu; // 第二条线终点x
                updatedParams[4][1] += data.y * beishu; // 第二条线终点y
                
                return {
                    ...item,
                    参数: updatedParams
                };
                
            case "矩形":
                // 更新两个对角点的坐标
                updatedParams[0][0] += data.x * beishu; // 左上角x
                updatedParams[0][1] += data.y * beishu; // 左上角y
                updatedParams[1][0] += data.x * beishu; // 右下角x
                updatedParams[1][1] += data.y * beishu; // 右下角y
                updatedParams[2][0] += data.x * beishu; // 可能的第三个点x
                updatedParams[2][1] += data.y * beishu; // 可能的第三个点y
                
                return {
                    ...item,
                    参数: updatedParams
                };
                
            case "圆形":
                // 更新圆心坐标
                updatedParams[0][0] += data.x * beishu; // 圆心x
                updatedParams[0][1] += data.y * beishu; // 圆心y
                updatedParams[2][0] += data.x * beishu; // 可能的第二个点x
                updatedParams[2][1] += data.y * beishu; // 可能的第二个点y
                
                return {
                    ...item,
                    参数: updatedParams
                };
                
            default:
                // 对于其他形状或未处理的形状，保持原样
                return item;
        }
    });
    
    // 更新存储的记录
    drawRecord = updatedRecord;
    
    return {
        success: true,
        message: `平移 ${data.x}, ${data.y}`,
        draw_record: drawRecord
    };
}

/**
 * 处理缩放操作
 * @param {Object} data - 缩放数据 {scale: 1.04}
 * @returns {Object} 处理结果
 */
function handleScale(data) {
    beishu *= data.scale;
    // 缩放操作需要更新绘制记录中的坐标和长度
    const updatedRecord = drawRecord.map(item => {
        // 深拷贝参数对象
        const updatedParams = JSON.parse(JSON.stringify(item.参数));
        
        switch (item.形状) {
            case "画线":
                // 获取中心点作为缩放中心
                const centerX = (updatedParams[0][0] + updatedParams[1][0]) / 2;
                const centerY = (updatedParams[0][1] + updatedParams[1][1]) / 2;
                
                // 相对于中心点进行缩放
                const newStartX = centerX + (updatedParams[0][0] - centerX) * beishu;
                const newStartY = centerY + (updatedParams[0][1] - centerY) * beishu;
                const newEndX = centerX + (updatedParams[1][0] - centerX) * beishu;
                const newEndY = centerY + (updatedParams[1][1] - centerY) * beishu;
                
                // 更新坐标
                updatedParams[0][0] = newStartX; // 起点x
                updatedParams[0][1] = newStartY; // 起点y
                updatedParams[1][0] = newEndX;   // 终点x
                updatedParams[1][1] = newEndY;   // 终点y
                
                // 重新计算长度（使用更精确的方法）
                // const newLength = Math.sqrt(
                //     Math.pow(newEndX - newStartX, 2) + 
                //     Math.pow(newEndY - newStartY, 2)
                // );
                // updatedParams[2][0] = newLength.toFixed(2); // 保留两位小数
                
                return {
                    ...item,
                    参数: updatedParams
                };
                
            case "量角":
                // 获取中心点作为缩放中心
                const angleCenterX = (updatedParams[0][0] + updatedParams[1][0] + updatedParams[2][0]) / 3;
                const angleCenterY = (updatedParams[0][1] + updatedParams[1][1] + updatedParams[2][1]) / 3;
                
                // 相对于中心点进行缩放
                updatedParams[0][0] = angleCenterX + (updatedParams[0][0] - angleCenterX) * beishu;
                updatedParams[0][1] = angleCenterY + (updatedParams[0][1] - angleCenterY) * beishu;
                updatedParams[1][0] = angleCenterX + (updatedParams[1][0] - angleCenterX) * beishu;
                updatedParams[1][1] = angleCenterY + (updatedParams[1][1] - angleCenterY) * beishu;
                updatedParams[2][0] = angleCenterX + (updatedParams[2][0] - angleCenterX) * beishu;
                updatedParams[2][1] = angleCenterY + (updatedParams[2][1] - angleCenterY) * beishu;
                
                return {
                    ...item,
                    参数: updatedParams
                };
                
            case "心胸比":
                // 获取中心点作为缩放中心
                const chestCenterX = (updatedParams[0][0] + updatedParams[1][0] + updatedParams[3][0] + updatedParams[4][0]) / 4;
                const chestCenterY = (updatedParams[0][1] + updatedParams[1][1] + updatedParams[3][1] + updatedParams[4][1]) / 4;
                
                // 相对于中心点进行缩放
                updatedParams[0][0] = chestCenterX + (updatedParams[0][0] - chestCenterX) * beishu;
                updatedParams[0][1] = chestCenterY + (updatedParams[0][1] - chestCenterY) * beishu;
                updatedParams[1][0] = chestCenterX + (updatedParams[1][0] - chestCenterX) * beishu;
                updatedParams[1][1] = chestCenterY + (updatedParams[1][1] - chestCenterY) * beishu;
                updatedParams[3][0] = chestCenterX + (updatedParams[3][0] - chestCenterX) * beishu;
                updatedParams[3][1] = chestCenterY + (updatedParams[3][1] - chestCenterY) * beishu;
                updatedParams[4][0] = chestCenterX + (updatedParams[4][0] - chestCenterX) * beishu;
                updatedParams[4][1] = chestCenterY + (updatedParams[4][1] - chestCenterY) * beishu;
                
                // 重新计算长度
                // const newFirstLength = Math.sqrt(
                //     Math.pow(updatedParams[1][0] - updatedParams[0][0], 2) + 
                //     Math.pow(updatedParams[1][1] - updatedParams[0][1], 2)
                // );
                // const newSecondLength = Math.sqrt(
                //     Math.pow(updatedParams[4][0] - updatedParams[3][0], 2) + 
                //     Math.pow(updatedParams[4][1] - updatedParams[3][1], 2)
                // );
                
                // updatedParams[2][0] = newFirstLength.toFixed(2);
                // updatedParams[5][0] = newSecondLength.toFixed(2);
                
                // 重新计算心胸比
                // updatedParams[6][0] = (newFirstLength / newSecondLength).toFixed(2);
                
                return {
                    ...item,
                    参数: updatedParams
                };
                
            case "矩形":
                // 获取中心点作为缩放中心
                const rectCenterX = (updatedParams[0][0] + updatedParams[1][0]) / 2;
                const rectCenterY = (updatedParams[0][1] + updatedParams[1][1]) / 2;
                
                // 相对于中心点进行缩放
                updatedParams[0][0] = rectCenterX + (updatedParams[0][0] - rectCenterX) * beishu;
                updatedParams[0][1] = rectCenterY + (updatedParams[0][1] - rectCenterY) * beishu;
                updatedParams[1][0] = rectCenterX + (updatedParams[1][0] - rectCenterX) * beishu;
                updatedParams[1][1] = rectCenterY + (updatedParams[1][1] - rectCenterY) * beishu;
                updatedParams[2][0] = rectCenterX + (updatedParams[2][0] - rectCenterX) * beishu;
                updatedParams[2][1] = rectCenterY + (updatedParams[2][1] - rectCenterY) * beishu;
                
                return {
                    ...item,
                    参数: updatedParams
                };
                
            case "圆形":
                // 获取中心点作为缩放中心
                const circleCenterX = updatedParams[0][0];
                const circleCenterY = updatedParams[0][1];
                
                // 缩放半径
                // updatedParams[1][0] = updatedParams[1][0] * beishu;
                
                // 更新相关点坐标
                updatedParams[2][0] = circleCenterX + (updatedParams[2][0] - circleCenterX) * beishu;
                updatedParams[2][1] = circleCenterY + (updatedParams[2][1] - circleCenterY) * beishu;
                
                return {
                    ...item,
                    参数: updatedParams
                };
                
            default:
                // 对于其他形状或未处理的形状，保持原样
                return item;
        }
    });
    
    // 更新存储的记录
    drawRecord = updatedRecord;
    
    return {
        success: true,
        message: `缩放 ${data.scale}`,
        draw_record: drawRecord
    };
}

/**
 * 获取当前绘制记录
 * @returns {Array} 当前绘制记录
 */
export function getDrawRecord() {
    return drawRecord;
}

/**
 * 设置绘制记录
 * @param {Array} record - 新的绘制记录
 */
export function setDrawRecord(record) {
    drawRecord = [...record];
}