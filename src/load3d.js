import vtkCursor3D from "@kitware/vtk.js/Filters/Sources/Cursor3D";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
class Display3D{
    /**
 * 创建并显示一个 vtkCursor3D 边框
 * @param {Object} view3D - 包含 renderer 和 renderWindow 的对象
 * @param {Array} focalPoint - 设置焦点 [x, y, z]
 * @param {Array} modelBounds - 设置模型边界 [xmin, xmax, ymin, ymax, zmin, zmax]
 * @param {Object} options - 配置选项，例如是否显示边框、阴影、坐标轴等
 */
 setupCursor3D(
    view3D,
    focalPoint = [0, 0, 0],
    modelBounds = [-10, 10, -10, 10, -10, 10],
    options = {}
  ) {
    // 清除渲染器中的所有演员
    view3D.renderer.getActors().forEach((actor) => {
      view3D.renderer.removeActor(actor);
    });

    // 创建新的 vtkCursor3D
    const cursor3D = vtkCursor3D.newInstance();
    cursor3D.setFocalPoint(focalPoint);
    cursor3D.setModelBounds(modelBounds);
  
    // 设置选项，默认只显示边框
    cursor3D.set({
      zShadows: options.zShadows ?? false,
      xShadows: options.xShadows ?? false,
      yShadows: options.yShadows ?? false,
      outline: options.outline ?? true,
      axes: options.axes ?? false,
      center: options.center ?? false,
    });
  
    // 创建 Mapper 和 Actor
    const cursor3DMapper = vtkMapper.newInstance();
    cursor3DMapper.setInputConnection(cursor3D.getOutputPort());
    const cursor3DActor = vtkActor.newInstance();
    cursor3DActor.setMapper(cursor3DMapper);
    // 设置 Actor 的颜色为白色
    cursor3DActor.getProperty().setColor(1.0, 1.0, 1.0); // RGB(1, 1, 1) 表示白色
    // 设置线条加粗（设置线宽）
    cursor3DActor.getProperty().setLineWidth(3.0); // 将线宽设置为 3（默认是 1）
    // 添加到渲染器
    view3D.renderer.addActor(cursor3DActor);
  
    // 更新渲染器
    view3D.renderer.resetCamera();
    view3D.renderWindow.render();
  
    // 更新 view3D 引用
    view3D.cursor3D = cursor3D;
    view3D.cursor3DMapper = cursor3DMapper;
    view3D.cursor3DActor = cursor3DActor;
  }
  
}
export default Display3D;