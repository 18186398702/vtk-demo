import daikon from "./halo_200804";
import "@kitware/vtk.js/favicon";

// Load the rendering pieces we want to use (for both WebGL and WebGPU)
import "@kitware/vtk.js/Rendering/Profiles/All";

import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkAnnotatedCubeActor from "@kitware/vtk.js/Rendering/Core/AnnotatedCubeActor";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";
import vtkGenericRenderWindow from "@kitware/vtk.js/Rendering/Misc/GenericRenderWindow";
import vtkImageMapper from "@kitware/vtk.js/Rendering/Core/ImageMapper";
import vtkImageReslice from "@kitware/vtk.js/Imaging/Core/ImageReslice";
import vtkImageSlice from "@kitware/vtk.js/Rendering/Core/ImageSlice";
import vtkInteractorStyleImage from "@kitware/vtk.js/Interaction/Style/InteractorStyleImage";
import vtkInteractorStyleTrackballCamera from "@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera";
import vtkMath from "@kitware/vtk.js/Common/Core/Math";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkOutlineFilter from "@kitware/vtk.js/Filters/General/OutlineFilter";
import vtkOrientationMarkerWidget from "@kitware/vtk.js/Interaction/Widgets/OrientationMarkerWidget";
import vtkResliceCursorWidget from "@kitware/vtk.js/Widgets/Widgets3D/ResliceCursorWidget";
import vtkWidgetManager from "@kitware/vtk.js/Widgets/Core/WidgetManager";

import vtkSphereSource from "@kitware/vtk.js/Filters/Sources/SphereSource";
import { CaptureOn } from "@kitware/vtk.js/Widgets/Core/WidgetManager/Constants";

import { vec3 } from "gl-matrix";
import { SlabMode } from "@kitware/vtk.js/Imaging/Core/ImageReslice/Constants";
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import {
  xyzToViewType,
  InteractionMethodsName,
} from "@kitware/vtk.js/Widgets/Widgets3D/ResliceCursorWidget/Constants";

// ----------------------------------------------------------------------------
// Define main attributes
// ----------------------------------------------------------------------------

const viewColors = [
  [1, 0, 0], // sagittal
  [0, 1, 0], // coronal
  [0, 0, 1], // axial
  [0.5, 0.5, 0.5], // 3D
];

const viewAttributes = [];
window.va = viewAttributes;
const widget = vtkResliceCursorWidget.newInstance();
window.widget = widget;
const widgetState = widget.getWidgetState();
// Set size in CSS pixel space because scaleInPixels defaults to true
widgetState.getStatesWithLabel("sphere").forEach((handle) => handle.setScale1(20));
const showDebugActors = true;
const windowWidthCenter = [];
const appCursorStyles = {
  translateCenter: "move",
  rotateLine: "alias",
  translateAxis: "pointer",
  default: "default",
};

// ----------------------------------------------------------------------------
// Define html structure
// ----------------------------------------------------------------------------

const container = document.querySelector("body");
const controlContainer = document.createElement("div");
container.appendChild(controlContainer);
const checkboxTranslation = document.getElementById("checkboxTranslation");
const checkboxShowRotation = document.getElementById("checkboxShowRotation");
const checkboxRotation = document.getElementById("checkboxRotation");
const checkboxOrthogonality = document.getElementById("checkboxOrthogonality");

// ----------------------------------------------------------------------------
// Setup rendering code
// ----------------------------------------------------------------------------

/**
 * Function to create synthetic image data with correct dimensions
 * Can be use for debug
 * @param {Array[Int]} dims
 */
// eslint-disable-next-line no-unused-vars
function createSyntheticImageData(dims) {
  const imageData = vtkImageData.newInstance();
  const newArray = new Uint8Array(dims[0] * dims[1] * dims[2]);
  const s = 0.1;
  imageData.setSpacing(s, s, s);
  imageData.setExtent(0, 127, 0, 127, 0, 127);
  let i = 0;
  for (let z = 0; z < dims[2]; z++) {
    for (let y = 0; y < dims[1]; y++) {
      for (let x = 0; x < dims[0]; x++) {
        newArray[i++] = (256 * (i % (dims[0] * dims[1]))) / (dims[0] * dims[1]);
      }
    }
  }

  const da = vtkDataArray.newInstance({
    numberOfComponents: 1,
    values: newArray,
  });
  da.setName("scalars");

  imageData.getPointData().setScalars(da);

  return imageData;
}

function createRGBStringFromRGBValues(rgb) {
  if (rgb.length !== 3) {
    return "rgb(0, 0, 0)";
  }
  return `rgb(${(rgb[0] * 255).toString()}, ${(rgb[1] * 255).toString()}, ${(
    rgb[2] * 255
  ).toString()})`;
}

const initialPlanesState = { ...widgetState.getPlanes() };

let view3D = null;

for (let i = 0; i < 4; i++) {
  // 创建一个新的 div 元素作为容器，父级容器，用来放置视图
  const elementParent = document.createElement("div");
  // 为父容器设置 CSS 类名
  elementParent.setAttribute("class", "view");
  // 设置父容器的宽度为页面宽度的 50%
  elementParent.style.width = "50%";
  // 设置父容器的高度为 300px
  elementParent.style.height = "300px";
  // 设置父容器的显示方式为 inline-block，确保它会与其他元素并排显示
  elementParent.style.display = "inline-block"; // 保留上下外边距/内边距

  // 创建一个新的 div 元素作为实际的视图容器
  const element = document.createElement("div");
  // 为视图容器设置 CSS 类名
  element.setAttribute("class", "view");
  // 设置视图容器的宽度为父容器的 100%
  element.style.width = "100%";
  // 设置视图容器的高度为父容器的 100%
  element.style.height = "100%";
  // 将实际的视图容器添加到父容器中
  elementParent.appendChild(element);

  // 将父容器添加到页面的指定容器（container）中
  container.appendChild(elementParent);

  // 创建一个 vtkGenericRenderWindow 实例，负责管理 VTK 渲染窗口
  const grw = vtkGenericRenderWindow.newInstance();
  // 将刚才创建的视图容器赋给渲染窗口容器
  grw.setContainer(element);
  // 调用 resize 方法确保渲染窗口的尺寸与视图容器一致
  grw.resize();

  // 创建一个对象，用于存储渲染窗口、渲染器、GL 渲染窗口等属性
  const obj = {
    renderWindow: grw.getRenderWindow(), // 获取渲染窗口对象
    renderer: grw.getRenderer(), // 获取渲染器对象
    GLWindow: grw.getApiSpecificRenderWindow(), // 获取与 API 相关的渲染窗口对象
    interactor: grw.getInteractor(), // 获取交互器对象，用于处理用户输入（例如鼠标操作）
    widgetManager: vtkWidgetManager.newInstance(), // 创建一个新的小部件管理器实例，管理各种交互小部件
    orientationWidget: null, // 当前没有设置方向小部件（通常用于显示视图方向等信息）
  };

  // 设置当前活跃相机为平行投影（不使用透视效果）
  obj.renderer.getActiveCamera().setParallelProjection(true);

  // 设置渲染器的背景颜色，viewColors[i] 是一个 RGB 颜色数组
  obj.renderer.setBackground(...viewColors[i]);

  // 将渲染器添加到渲染窗口中，这样渲染器才能在窗口中显示
  obj.renderWindow.addRenderer(obj.renderer);
  // 将 OpenGL 窗口添加到渲染窗口，确保渲染窗口能够显示 3D 图形
  obj.renderWindow.addView(obj.GLWindow);

  // 设置交互器与渲染窗口关联，确保用户能够与窗口进行交互
  obj.renderWindow.setInteractor(obj.interactor);

  // 设置交互器与 OpenGL 窗口关联，确保用户与窗口的交互正确显示
  obj.interactor.setView(obj.GLWindow);

  // 初始化交互器，准备开始与用户的交互
  obj.interactor.initialize();

  // 绑定事件到 HTML 元素，使得用户可以通过鼠标和键盘与视图进行交互
  obj.interactor.bindEvents(element);

  // 设置小部件管理器的渲染器，这样小部件可以在正确的渲染器上渲染
  obj.widgetManager.setRenderer(obj.renderer);

  if (i < 3) {
    // 设置交互器的样式为 vtk.js 提供的 `vtkInteractorStyleImage` 实例
    obj.interactor.setInteractorStyle(vtkInteractorStyleImage.newInstance());
    // 添加一个小部件（widget）到 widgetManager，并根据 xyzToViewType[i] 设置其类型
    obj.widgetInstance = obj.widgetManager.addWidget(widget, xyzToViewType[i]);
    // 将小部件的缩放方式设置为基于像素
    obj.widgetInstance.setScaleInPixels(true);
    // 调整小部件的孔宽度为 2
    obj.widgetInstance.setHoleWidth(0);
    // 设置小部件为非无限线（即长度有限）
    obj.widgetInstance.setInfiniteLine(false);
    // 调整标签为 'line' 的所有状态的缩放比例
    // x 和 y 轴方向的缩放因子为 2（变宽和变高）
    // z 轴方向的缩放因子为 300（在深度方向拉长）
    widgetState.getStatesWithLabel("line").forEach((state) => state.setScale3(2, 2, 1000));
    // 调整标签为 'center' 的所有状态的不透明度为 128
    widgetState.getStatesWithLabel("center").forEach((state) => state.setOpacity(0));
    // 设置小部件是否保持正交性（即垂直关系），值取决于 checkboxOrthogonality 的选中状态
    obj.widgetInstance.setKeepOrthogonality(checkboxOrthogonality.checked);
    // 设置小部件的鼠标指针样式，`appCursorStyles` 是自定义的样式对象
    obj.widgetInstance.setCursorStyles(appCursorStyles);
    // 启用小部件的拾取功能（即可以通过鼠标交互选择小部件）
    obj.widgetManager.enablePicking();
    // 设置小部件管理器在鼠标移动时捕获渲染器缓冲区的行为
    obj.widgetManager.setCaptureOn(CaptureOn.MOUSE_MOVE);
  } else {
    obj.interactor.setInteractorStyle(vtkInteractorStyleTrackballCamera.newInstance());
  }

  // 创建一个 vtkImageReslice 实例，用于图像重切割操作
  obj.reslice = vtkImageReslice.newInstance();

  // 设置重切割模式为 SlabMode.MEAN，表示在切割方向上对多个切片取平均
  obj.reslice.setSlabMode(SlabMode.MEAN);

  // 设置重切割操作的切片数量为 1，表示只取一个切片
  obj.reslice.setSlabNumberOfSlices(1);

  // 设置是否使用变换来输入采样，false 表示不使用变换
  obj.reslice.setTransformInputSampling(false);

  // 设置输出图像是否自动裁剪，true 表示输出图像会根据内容自动裁剪
  obj.reslice.setAutoCropOutput(true);

  // 设置输出图像的维度为 2，表示输出为 2D 图像（通常用于切片视图）
  obj.reslice.setOutputDimensionality(2);

  // 创建一个 vtkImageMapper 实例，用于映射图像数据
  obj.resliceMapper = vtkImageMapper.newInstance();

  // 将 vtkImageReslice 的输出连接到映射器，确保映射器能渲染重切割后的图像
  obj.resliceMapper.setInputConnection(obj.reslice.getOutputPort());

  // 创建一个 vtkImageSlice 实例，用于显示图像切片
  obj.resliceActor = vtkImageSlice.newInstance();
  // 将映射器应用到 vtkImageSlice 上，以便它能够渲染图像
  obj.resliceActor.setMapper(obj.resliceMapper);

  // 初始化一个空数组，用于存储球体演员对象
  obj.sphereActors = [];

  // 初始化一个空数组，用于存储球体源对象
  obj.sphereSources = [];

  // Create sphere for each 2D views which will be displayed in 3D
  // Define origin, point1 and point2 of the plane used to reslice the volume
  for (let j = 0; j < 3; j++) {
    // 创建一个新的 vtkSphereSource 实例，用于生成球体
    const sphere = vtkSphereSource.newInstance();
    // 设置球体的半径为 10
    sphere.setRadius(1);

    // 创建一个新的 vtkMapper 实例，负责将数据映射到渲染中
    const mapper = vtkMapper.newInstance();
    // 将球体的输出连接到映射器，以便映射器可以渲染球体
    mapper.setInputConnection(sphere.getOutputPort());

    // 创建一个新的 vtkActor 实例，负责在渲染中显示数据
    const actor = vtkActor.newInstance();
    // 将映射器应用到演员上，使其渲染球体
    actor.setMapper(mapper);

    // 设置球体演员的颜色，viewColors[i] 应该是一个 RGB 颜色数组
    actor.getProperty().setColor(...viewColors[i]);

    // 设置球体演员的可见性，showDebugActors 为布尔值，决定是否显示球体
    actor.setVisibility(showDebugActors);

    // 将演员添加到 obj.sphereActors 数组中，便于管理和后续操作
    obj.sphereActors.push(actor);

    // 将球体源添加到 obj.sphereSources 数组中，便于管理和后续操作
    obj.sphereSources.push(sphere);
  }

  if (i < 3) {
    viewAttributes.push(obj);
  } else {
    view3D = obj;
  }

  // create axes
  const axes = vtkAnnotatedCubeActor.newInstance();
  axes.setDefaultStyle({
    text: "+X",
    fontStyle: "bold",
    fontFamily: "Arial",
    fontColor: "black",
    fontSizeScale: (res) => res / 2,
    faceColor: createRGBStringFromRGBValues(viewColors[0]),
    faceRotation: 0,
    edgeThickness: 0.1,
    edgeColor: "black",
    resolution: 400,
  });
  // axes.setXPlusFaceProperty({ text: '+X' });
  axes.setXMinusFaceProperty({
    text: "-X",
    faceColor: createRGBStringFromRGBValues(viewColors[0]),
    faceRotation: 90,
    fontStyle: "italic",
  });
  axes.setYPlusFaceProperty({
    text: "+Y",
    faceColor: createRGBStringFromRGBValues(viewColors[1]),
    fontSizeScale: (res) => res / 4,
  });
  axes.setYMinusFaceProperty({
    text: "-Y",
    faceColor: createRGBStringFromRGBValues(viewColors[1]),
    fontColor: "white",
  });
  axes.setZPlusFaceProperty({
    text: "+Z",
    faceColor: createRGBStringFromRGBValues(viewColors[2]),
  });
  axes.setZMinusFaceProperty({
    text: "-Z",
    faceColor: createRGBStringFromRGBValues(viewColors[2]),
    faceRotation: 45,
  });

  // create orientation widget
  obj.orientationWidget = vtkOrientationMarkerWidget.newInstance({
    actor: axes,
    interactor: obj.renderWindow.getInteractor(),
  });
  obj.orientationWidget.setEnabled(true);
  obj.orientationWidget.setViewportCorner(vtkOrientationMarkerWidget.Corners.BOTTOM_RIGHT);
  obj.orientationWidget.setViewportSize(0.15);
  obj.orientationWidget.setMinPixelSize(100);
  obj.orientationWidget.setMaxPixelSize(300);

  // create sliders
  if (i < 3) {
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = 0;
    slider.max = 300;
    slider.style.bottom = "0px";
    slider.style.width = "100%";
    elementParent.appendChild(slider);
    obj.slider = slider;

    slider.addEventListener("change", (ev) => {
      const newDistanceToP1 = ev.target.value;
      const dirProj = widget.getWidgetState().getPlanes()[xyzToViewType[i]].normal;
      const planeExtremities = widget.getPlaneExtremities(xyzToViewType[i]);
      const newCenter = vtkMath.multiplyAccumulate(
        planeExtremities[0],
        dirProj,
        Number(newDistanceToP1),
        []
      );
      widget.setCenter(newCenter);
      obj.widgetInstance.invokeInteractionEvent(obj.widgetInstance.getActiveInteraction());
      viewAttributes.forEach((obj2) => {
        obj2.interactor.render();
      });
    });
  }
}

// ----------------------------------------------------------------------------
// Load image
// ----------------------------------------------------------------------------

function updateReslice(
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
  }
) {
  const modified = widget.updateReslicePlane(
    interactionContext.reslice,
    interactionContext.viewType
  );
  if (modified) {
    const resliceAxes = interactionContext.reslice.getResliceAxes();
    // Get returned modified from setter to know if we have to render
    interactionContext.actor.setUserMatrix(resliceAxes);
    const planeSource = widget.getPlaneSource(interactionContext.viewType);
    interactionContext.sphereSources[0].setCenter(planeSource.getOrigin());
    interactionContext.sphereSources[1].setCenter(planeSource.getPoint1());
    interactionContext.sphereSources[2].setCenter(planeSource.getPoint2());

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
  view3D.renderWindow.render();
  return modified;
}

// ----------------------------------------------------------------------------
// Define panel interactions
// ----------------------------------------------------------------------------
function updateViews() {
  viewAttributes.forEach((obj, i) => {
    updateReslice({
      viewType: xyzToViewType[i],
      reslice: obj.reslice,
      actor: obj.resliceActor,
      renderer: obj.renderer,
      resetFocalPoint: true,
      computeFocalPointOffset: true,
      sphereSources: obj.sphereSources,
      resetViewUp: true,
    });
    obj.renderWindow.render();
  });
  view3D.renderer.resetCamera();
  view3D.renderer.resetCameraClippingRange();
}

checkboxTranslation.addEventListener("change", (ev) => {
  viewAttributes.forEach((obj) =>
    obj.widgetInstance.setEnableTranslation(checkboxTranslation.checked)
  );
});

checkboxShowRotation.addEventListener("change", (ev) => {
  widgetState
    .getStatesWithLabel("rotation")
    .forEach((handle) => handle.setVisible(checkboxShowRotation.checked));
  viewAttributes.forEach((obj) => {
    obj.interactor.render();
  });
  checkboxRotation.checked = checkboxShowRotation.checked;
  checkboxRotation.disabled = !checkboxShowRotation.checked;
  checkboxRotation.dispatchEvent(new Event("change"));
});

checkboxRotation.addEventListener("change", (ev) => {
  viewAttributes.forEach((obj) => obj.widgetInstance.setEnableRotation(checkboxRotation.checked));
  checkboxOrthogonality.disabled = !checkboxRotation.checked;
  checkboxOrthogonality.dispatchEvent(new Event("change"));
});

checkboxOrthogonality.addEventListener("change", (ev) => {
  viewAttributes.forEach((obj) =>
    obj.widgetInstance.setKeepOrthogonality(checkboxOrthogonality.checked)
  );
});

const checkboxScaleInPixels = document.getElementById("checkboxScaleInPixels");
checkboxScaleInPixels.addEventListener("change", (ev) => {
  widget.setScaleInPixels(checkboxScaleInPixels.checked);
  viewAttributes.forEach((obj) => {
    obj.interactor.render();
  });
});

const opacity = document.getElementById("opacity");
opacity.addEventListener("input", (ev) => {
  const opacityValue = document.getElementById("opacityValue");
  opacityValue.innerHTML = ev.target.value;
  widget
    .getWidgetState()
    .getStatesWithLabel("handles")
    .forEach((handle) => handle.setOpacity(ev.target.value));
  viewAttributes.forEach((obj) => {
    obj.interactor.render();
  });
});

const optionSlabModeMin = document.getElementById("slabModeMin");
optionSlabModeMin.value = SlabMode.MIN;
const optionSlabModeMax = document.getElementById("slabModeMax");
optionSlabModeMax.value = SlabMode.MAX;
const optionSlabModeMean = document.getElementById("slabModeMean");
optionSlabModeMean.value = SlabMode.MEAN;
const optionSlabModeSum = document.getElementById("slabModeSum");
optionSlabModeSum.value = SlabMode.SUM;
const selectSlabMode = document.getElementById("slabMode");
selectSlabMode.addEventListener("change", (ev) => {
  viewAttributes.forEach((obj) => {
    obj.reslice.setSlabMode(Number(ev.target.value));
  });
  updateViews();
});

const sliderSlabNumberofSlices = document.getElementById("slabNumber");
sliderSlabNumberofSlices.addEventListener("change", (ev) => {
  const trSlabNumberValue = document.getElementById("slabNumberValue");
  trSlabNumberValue.innerHTML = ev.target.value;
  viewAttributes.forEach((obj) => {
    obj.reslice.setSlabNumberOfSlices(ev.target.value);
  });
  updateViews();
});

const buttonReset = document.getElementById("buttonReset");
buttonReset.addEventListener("click", () => {
  widgetState.setPlanes({ ...initialPlanesState });
  // 检查是否存在有效的图像
  const image = widget.getWidgetState().getImage();
  if (image) {
    // 设置中心点为图像中心
    widget.setCenter(image.getCenter());
    updateViews();
  } else {
    console.warn("No valid image found. Reset operation skipped for center.");
  }
});

const selectInterpolationMode = document.getElementById("selectInterpolation");
selectInterpolationMode.addEventListener("change", (ev) => {
  viewAttributes.forEach((obj) => {
    obj.reslice.setInterpolationMode(Number(ev.target.selectedIndex));
  });
  updateViews();
});

const checkboxWindowLevel = document.getElementById("checkboxWindowLevel");
checkboxWindowLevel.addEventListener("change", (ev) => {
  viewAttributes.forEach((obj, index) => {
    if (index < 3) {
      obj.interactor.setInteractorStyle(
        checkboxWindowLevel.checked
          ? vtkInteractorStyleImage.newInstance()
          : vtkInteractorStyleTrackballCamera.newInstance()
      );
    }
  });
});

//-----------------------------------------------------------------------------------------------------
const dicomTags = {
  imagePositionPatient: {
    id: "0020,0032", //图像在患者坐标系中的位置
    description: "Image Position (Patient)",
  },
  imageOrientationPatient: {
    id: "0020,0037", //图像方向矩阵
    description: "Image Orientation (Patient)",
  },
  pixelSpacing: {
    id: "0028,0030", //像素的物理间距
    description: "Pixel Spacing",
  },
  sliceThickness: {
    id: "0018,0050", //切片厚度
    description: "Slice Thickness",
  },
  instanceNumber: {
    id: "0020,0013", //当前影像序号
    description: "Instance Number",
  },
  sopInstanceUID: {
    id: "0008,0018", //唯一标识影像的
    UIDdescription: "SOP Instance UID",
  },
  rescaleIntercept: {
    id: "0028,1052", //像素值的物理转换截距
    description: "Rescale Intercept",
  },
  rescaleSlope: {
    id: "0028,1053", //像素值的物理转换斜率
    description: "Rescale Slope",
  },
  pixelData: {
    id: "7FE0,0010", //实际影像像素数据
    description: "Pixel Data",
  },
  windowCenter: {
    id: "0028,1050",
    description: "Window Center",
  },
  windowWidth: {
    id: "0028,1051",
    description: "Window Width",
  },
};

export async function load(ArrayBuffer) {
  let arrayBuffer = [];
  for (var i = 0; i < Object.keys(ArrayBuffer).length; i++) {
    const buffer = await ArrayBuffer[i]; // Resolve each promise
    if (buffer && buffer.byteLength > 0) {
      arrayBuffer.push(buffer);
    }
  }
  const loader = new Loader();
  loader.MPR(arrayBuffer);
}
export class Loader {
  MPR(array_Buffer) {
    let dicom_info = getTags(array_Buffer, dicomTags);
    if (dicom_info.length == 0) {
      console.error("获取 dicom 信息数据为空");
    } else {
      let imageData = createImageData(dicom_info);
      MultiSliceImageMapper(imageData);
    }
  }
}

// ---------------------------------------------------------------------------------------------------
function MultiSliceImageMapper(imageData) {
  if (!imageData) {
    console.error("imageData is not loaded or initialized.");
    return;
  }
  // 将加载的图像数据设置到一个假设的控件 `widget` 中进行显示
  widget.setImage(imageData);

  // 创建一个轮廓过滤器，用于生成图像的边界框
  const outline = vtkOutlineFilter.newInstance();
  // 设置输入数据为当前加载的图像数据
  outline.setInputData(imageData);
  // 创建一个映射器，用于将轮廓数据渲染到视图中
  const outlineMapper = vtkMapper.newInstance();
  // 设置映射器输入为轮廓数据的输出
  outlineMapper.setInputData(outline.getOutputData());
  // 创建一个演员（Actor），将轮廓渲染到 3D 视图中
  const outlineActor = vtkActor.newInstance();
  // 将轮廓映射器绑定到演员上
  outlineActor.setMapper(outlineMapper);
  // 将演员添加到 3D 渲染器中进行显示
  view3D.renderer.addActor(outlineActor);

  // 对每个视图的属性进行操作，`viewAttributes` 是包含多个视图属性的数组
  viewAttributes.forEach((obj, i) => {
    // 设置该视图的重采样输入数据为加载的图像数据
    obj.reslice.setInputData(imageData);
    const property = obj.resliceActor.getProperty();
    property.setColorWindow(windowWidthCenter[0]); // 设置窗口宽度
    property.setColorLevel(windowWidthCenter[1]); // 设置窗口中心
    // 将该视图的重采样演员添加到渲染器中
    obj.renderer.addActor(obj.resliceActor);
    // 将重采样演员添加到 3D 渲染器中进行显示
    view3D.renderer.addActor(obj.resliceActor);
    // 遍历并将该视图中的球体演员添加到渲染器中
    obj.sphereActors.forEach((actor) => {
      obj.renderer.addActor(actor);
      view3D.renderer.addActor(actor);
    });

    const reslice = obj.reslice;
    const viewType = xyzToViewType[i];

    // 对所有视图进行操作，确保在当前视图进行交互时能够正确更新切片
    viewAttributes.forEach((v) => {
      // 在交互开始时，更新重采样器的状态
      v.widgetInstance.onStartInteractionEvent(() => {
        updateReslice({
          viewType,
          reslice,
          actor: obj.resliceActor,
          renderer: obj.renderer,
          resetFocalPoint: false, // 交互开始时不重置焦点位置
          computeFocalPointOffset: true, // 允许计算焦点偏移
          sphereSources: obj.sphereSources,
          slider: obj.slider,
        });
      });

      // 在交互过程中，更新切片的位置和焦点
      v.widgetInstance.onInteractionEvent(
        // 可以根据当前交互方法判断是否允许更新焦点
        (interactionMethodName) => {
          const canUpdateFocalPoint = interactionMethodName === InteractionMethodsName.RotateLine;
          const activeViewType = widget.getWidgetState().getActiveViewType();
          // 如果当前视图是活动视图或不能更新焦点，则允许计算焦点偏移
          const computeFocalPointOffset = activeViewType === viewType || !canUpdateFocalPoint;
          updateReslice({
            viewType,
            reslice,
            actor: obj.resliceActor,
            renderer: obj.renderer,
            resetFocalPoint: false,
            computeFocalPointOffset,
            sphereSources: obj.sphereSources,
            slider: obj.slider,
          });
        }
      );
    });

    // 初始化时，更新切片的状态，并将焦点设置为图像中心
    updateReslice({
      viewType,
      reslice,
      actor: obj.resliceActor,
      renderer: obj.renderer,
      resetFocalPoint: true, // 重置焦点到图像中心
      computeFocalPointOffset: true, // 允许计算当前偏移
      sphereSources: obj.sphereSources,
      slider: obj.slider,
    });
    // 渲染当前视图
    obj.interactor.render();
  });

  // 重置 3D 渲染器的相机，确保视图显示正确
  view3D.renderer.resetCamera();
  // 重置相机的裁剪范围
  view3D.renderer.resetCameraClippingRange();

  // 设置最大切片数量到滑块的最大值
  const maxNumberOfSlices = vec3.length(imageData.getDimensions());
  document.getElementById("slabNumber").max = maxNumberOfSlices;
}

function createImageData(dicomSlices) {
  // 判断 dicomSlices 是否是一个有效数组
  if (!Array.isArray(dicomSlices) || dicomSlices.length === 0) {
    console.log("dicomSlices 不是一个有效的数组或数组为空");
    return null; // 返回 null 或者其他合适的值表示创建失败
  }
  // 提取第一个 dicomSlice 的必要信息
  const firstSlice = dicomSlices[0];
  const { pixelData, windowCenter, windowWidth, sliceThickness, pixelSpacing } = firstSlice;

  const { Description: pixelDataDescription } = pixelData;
  const { Description: windowCenterDescription } = windowCenter;
  const { Description: windowWidthDescription } = windowWidth;
  const { Description: sliceThicknessDescription } = sliceThickness;
  const { Description: pixelSpacingDescription } = pixelSpacing;

  const imageData = vtkImageData.newInstance();
  const dimensions = [
    pixelDataDescription.numCols,
    pixelDataDescription.numRows,
    dicomSlices.length,
  ];
  imageData.setDimensions(...dimensions);
  windowWidthCenter.push(windowWidthDescription[0]);
  windowWidthCenter.push(windowCenterDescription[0]);
  console.log("windowWidthCenter", windowWidthCenter);
  // 设置图像数据的维度和体素间距
  let spacing = [
    pixelSpacingDescription[0],
    pixelSpacingDescription[1],
    sliceThicknessDescription[0],
  ];
  imageData.setSpacing(spacing);
  imageData.setOrigin([0, 0, 0]);
  const typedPixelArray = new Float32Array(dimensions[0] * dimensions[1] * dimensions[2]);
  dicomSlices.forEach((slice, index) => {
    const slicePixelData = slice.pixelData.Description.data;
    const sliceOffset = dimensions[0] * dimensions[1] * index;
    typedPixelArray.set(slicePixelData, sliceOffset);
  });
  const scalarArray = vtkDataArray.newInstance({
    name: "Pixels",
    dataType: "Float32Array",
    numberOfComponents: 1,
    values: typedPixelArray,
  });
  imageData.getPointData().setScalars(scalarArray);
  return imageData;
}

function getTags(arrayBuffer, dicomTags) {
  console.log("arrayBuffer", arrayBuffer);
  let dicom_info = [];
  if (arrayBuffer.length == 0) {
    console.error("获取文件buffer为空,不支持获取tags数据");
  } else {
    arrayBuffer.forEach((buffer) => {
      const data_a = new DataView(buffer);
      daikon.Parser.verbose = true;
      const dicom_data = daikon.Series.parseImage(data_a);
      let tagsInfo = {};
      for (const key in dicomTags) {
        const tag = dicomTags[key];
        const idWithoutComma = tag.id.replace(/,/g, ""); // 去除逗号
        let info = {};
        if (idWithoutComma == "7FE00010") {
          var hit_bit = dicom_data.getInterpretedData(false, true);
          Object.assign(info, { ID: idWithoutComma, Description: hit_bit });
          tagsInfo[key] = info;
        }
        if (idWithoutComma in dicom_data.tags && idWithoutComma != "7FE00010") {
          Object.assign(info, {
            ID: idWithoutComma,
            Description: dicom_data.tags[idWithoutComma].value,
          });
          tagsInfo[key] = info;
        }
      }
      dicom_info.push(tagsInfo);
    });
  }
  return dicom_info;
}
export function f_load_directory(selectFiles) {
  let dicom_arraybuffer = [];
  for (var file of selectFiles) {
    const readFileAsync = (file) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (evt) => resolve(evt.target.result);
        reader.readAsArrayBuffer(file);
      });
    dicom_arraybuffer.push(readFileAsync(file));
  }
  return dicom_arraybuffer;
}
