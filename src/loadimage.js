import vtkMath from "@kitware/vtk.js/Common/Core/Math";
import vtk from "@kitware/vtk.js/vtk";
class LoadImage {
  AxesArr = ["", "", ""]
  updateReslice(view3D, widget, widgetState,
    interactionContext = {
      viewType: "",
      reslice: null,
      actor: null,
      renderer: null,
      resetFocalPoint: false, // Reset the focal point to the center of the display image
      computeFocalPointOffset: false, // Defines if the display offset between reslice center and focal point has to be
      // computed. If so, then this offset will be used to keep the focal point position during rotation.
      spheres: null,
      slider: null,
      mapper: null
    }, callBackFun
  ) {
    const modified = widget.updateReslicePlane(
      interactionContext.reslice,
      interactionContext.viewType
    );
    if (modified) {
      // console.log("图像变化了", interactionContext.viewType, interactionContext.mapper.getSlice())
      const resliceAxes = interactionContext.reslice.getResliceAxes();
      // Get returned modified from setter to know if we have to render
      interactionContext.actor.setUserMatrix(resliceAxes);
      let index = interactionContext.viewType - 4;
      // 拼接字符
      let prestr = interactionContext.viewType == 4 ? "vtk11_" : interactionContext.viewType == 5 ? "vtk12_" : "vtk21_";
      let sliceStr = prestr + resliceAxes.join('-')
      let vtkDiv = document.getElementById("VTK-image-div-" + index)
      let cavDom = vtkDiv.querySelector("canvas")
      // dom加一个属性
      cavDom.setAttribute("sliceId", sliceStr)
      if (this.AxesArr[index] != sliceStr) {
        this.AxesArr[index] = sliceStr;
        if (callBackFun) {
          callBackFun(1, { slice: sliceStr }, "VTK-image-div-" + index)
        }
      }
      console.log(this.AxesArr)
      // const planeSource = widget.getPlaneSource(interactionContext.viewType);
      // interactionContext.sphereSources[0].setCenter(planeSource.getOrigin());
      // interactionContext.sphereSources[1].setCenter(planeSource.getPoint1());
      // interactionContext.sphereSources[2].setCenter(planeSource.getPoint2());
      if (interactionContext.slider) {
        const planeExtremities = widget.getPlaneExtremities(interactionContext.viewType);
        const length = Math.sqrt(
          vtkMath.distance2BetweenPoints(planeExtremities[0], planeExtremities[1])
        );
        const dist = Math.sqrt(
          vtkMath.distance2BetweenPoints(planeExtremities[0], widgetState.getCenter())
        );
        interactionContext.slider.min = 0;
        interactionContext.slider.max = length;
        interactionContext.slider.value = dist;
      }
    }
    widget.updateCameraPoints(
      interactionContext.renderer,
      interactionContext.viewType,
      interactionContext.resetFocalPoint,
      interactionContext.computeFocalPointOffset
    );
    // interactionContext.renderer.resetCamera()
    // interactionContext.renderer.getActiveCamera().setParallelScale(200); // 例如，将当前值减半

    view3D.renderWindow.render();
    return modified;
  }


}
export default LoadImage;