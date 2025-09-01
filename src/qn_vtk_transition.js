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