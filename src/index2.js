import "@kitware/vtk.js/favicon";

// Load the rendering pieces we want to use (for both WebGL and WebGPU)
import "@kitware/vtk.js/Rendering/Profiles/All";

import vtkAnnotatedCubeActor from "@kitware/vtk.js/Rendering/Core/AnnotatedCubeActor";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";
import vtkGenericRenderWindow from "@kitware/vtk.js/Rendering/Misc/GenericRenderWindow";
import vtkImageMapper from "@kitware/vtk.js/Rendering/Core/ImageMapper";
import vtkImageReslice from "@kitware/vtk.js/Imaging/Core/ImageReslice";
import vtkImageSlice from "@kitware/vtk.js/Rendering/Core/ImageSlice";
import vtkInteractorStyleImage from "@kitware/vtk.js/Interaction/Style/InteractorStyleImage";
import vtkInteractorStyleTrackballCamera from "@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera";
import vtkMath from "@kitware/vtk.js/Common/Core/Math";
import vtkOutlineFilter from "@kitware/vtk.js/Filters/General/OutlineFilter";
import vtkOrientationMarkerWidget from "@kitware/vtk.js/Interaction/Widgets/OrientationMarkerWidget";
import vtkResliceCursorWidget from "@kitware/vtk.js/Widgets/Widgets3D/ResliceCursorWidget";
import vtkWidgetManager from "@kitware/vtk.js/Widgets/Core/WidgetManager";

import vtkSphereSource from "@kitware/vtk.js/Filters/Sources/SphereSource";
import { CaptureOn } from "@kitware/vtk.js/Widgets/Core/WidgetManager/Constants";
import vtkImageCPRMapper from "@kitware/vtk.js/Rendering/Core/ImageCPRMapper";
import { vec3 } from "gl-matrix";
import { SlabMode } from "@kitware/vtk.js/Imaging/Core/ImageReslice/Constants";
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import {
  xyzToViewType,
  InteractionMethodsName,
} from "@kitware/vtk.js/Widgets/Widgets3D/ResliceCursorWidget/Constants";
import vtkVolume from "@kitware/vtk.js/Rendering/Core/Volume";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkVolumeMapper from "@kitware/vtk.js/Rendering/Core/VolumeMapper";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkImageMarchingCubes from "@kitware/vtk.js/Filters/General/ImageMarchingCubes";
import SyntheticImageData from "./syntheticimage";
import Display3D from "./load3d";
import LoadImage from "./loadimage";
import config from "./config.json";

// ----------------------------------------------------------------------------
// 定义主要属性
// ----------------------------------------------------------------------------
const viewAttributes = [];
let view3D = null;
let imageData = null;
window.va = viewAttributes;
const widget = vtkResliceCursorWidget.newInstance();
window.widget = widget;
const widgetState = widget.getWidgetState();

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
// 配置文件参数
// ----------------------------------------------------------------------------
const viewColors =
  config.viewColors && config.viewColors.length > 0
    ? config.viewColors
    : [
        [1, 0, 0], // axial
        [0, 1, 0], // coronal
        [0, 0, 1], // sagittal
        [0.5, 0.5, 0.5], // 3D
      ];

const syntheticImageData = new SyntheticImageData();
const display3d = new Display3D();
const loadimage = new LoadImage();
// ----------------------------------------------------------------------------
// 定义 html 结构
// ----------------------------------------------------------------------------
const container = document.getElementById("container");
container.style.display = "flex";
container.style.flexFlow = "wrap-reverse";
container.style.justifyContent = "space-between";
const controlContainer = document.createElement("div");
container.appendChild(controlContainer);
const checkboxTranslation = document.getElementById("checkboxTranslation");
const checkboxShowRotation = document.getElementById("checkboxShowRotation");
const checkboxRotation = document.getElementById("checkboxRotation");
const checkboxOrthogonality = document.getElementById("checkboxOrthogonality");
for (let i = 0; i < 4; i++) {
  // 创建一个新的 div 元素作为容器，父级容器，用来放置视图
  const elementParent = document.createElement("div");
  // 为父容器设置 CSS 类名
  // elementParent.setAttribute("class", "view");
  // 设置父容器的宽度为页面宽度的 50%
  elementParent.style.width = "50%";
  // 设置父容器的高度为 300px
  elementParent.style.height = "400px";
  // 设置父容器的显示方式为 inline-block，确保它会与其他元素并排显示
  elementParent.style.display = "inline-block"; // 保留上下外边距/内边距
  // 创建一个新的 div 元素作为实际的视图容器
  const element = document.createElement("div");
  // 为视图容器设置 CSS 类名
  // element.setAttribute("class", "view");
  // 设置视图容器的宽度为父容器的 100%
  element.style.width = "100%";
  // 设置视图容器的高度为父容器的 100%
  element.style.height = "90%";
  element.style.display = "inline-block"; // 保留上下外边距/内边距
  // 将实际的视图容器添加到父容器中
  elementParent.appendChild(element);
  // 将父容器添加到页面的指定容器（container）中
  container.appendChild(elementParent);
  //-------------------------------------------------------------------------------------------------------------------------------
  //-------------------------------------------------------------------------------------------------------------------------------
  // 创建一个 vtkGenericRenderWindow 实例，负责管理 VTK 渲染窗口
  const grw = vtkGenericRenderWindow.newInstance();
  // 将刚才创建的视图容器赋给渲染窗口容器
  grw.setContainer(element);
  // 调用 resize 方法确保渲染窗口的尺寸与视图容器一致
  grw.resize();
  //-------------------------------------------------------------------------------------------------------------------------------
  //-------------------------------------------------------------------------------------------------------------------------------
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
  //----------------------------线-------------------------------------------------------------------------------------------------
  //-------------------------------------------------------------------------------------------------------------------------------
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
  //--------------------------------图像-----------------------------------------------------------------------------------------------
  //-------------------------------------------------------------------------------------------------------------------------------
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
  // obj.resliceActor.setPosition(-200, -200, 0);  // 调整 X 和 Y 的位置
  // obj.resliceActor.setScale(2.0, 2.0, 1.0);
  // 将映射器应用到 vtkImageSlice 上，以便它能够渲染图像
  obj.resliceActor.setMapper(obj.resliceMapper);

  // 初始化一个空数组，用于存储球体演员对象
  obj.sphereActors = [];

  // 初始化一个空数组，用于存储球体源对象
  obj.sphereSources = [];
  //-------------------------------------------------------------------------------------------------------------------------------
  //-------------------------------------------------------------------------------------------------------------------------------
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
    // 调用封装函数，创建一个 vtkCursor3D 边框
    display3d.setupCursor3D(view3D);
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

  const bottomDisplay = document.createElement("div");
  // bottomDisplay.setAttribute("class", "view");
  bottomDisplay.style.top = "0px";
  bottomDisplay.style.width = "100%";
  bottomDisplay.style.height = "10%";

  element.appendChild(bottomDisplay);
  if (i < 3) {
    const bottomDiv = document.createElement("div");
    // bottomDiv.setAttribute("class", "view");
    bottomDiv.style.width = "100%";
    bottomDiv.style.height = "100%";
    bottomDiv.style.display = "flex";
    // bottomDiv0.innerText = "这是底部显示文本";  // 你可以修改这里的文本内容
    // const buttonContainer = document.createElement("div");
    // // buttonContainer.setAttribute("class", "view");
    // buttonContainer.style.width = "30%";
    // buttonContainer.style.height = "100%";
    // buttonContainer.style.display = "flex";
    // buttonContainer.style.border = "2px solid black"; // 2px 宽的黑色实线边框

    const slide = document.createElement("div");
    // slide.setAttribute("class", "view");
    slide.style.width = "100%";
    slide.style.height = "100%";
    slide.style.display = "flex";
    // slide.style.border = "2px solid black"; // 2px 宽的黑色实线边框
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = 0;
    slider.max = 300;
    slider.style.bottom = "0px";
    slider.style.width = "100%";
    slide.appendChild(slider);

    // const axialButton = createColorCheckbox("轴向截面(Axial)", "axial");
    // slide.appendChild(axialButton);
    // axialButton.addEventListener("input",(ev) => {
    //   alert("达到最高点击次数！",ev);
    // });
    // if (i==0){
    //   const axialButton = createColorButton("轴向截面(Axial)", "axial");
    //   buttonContainer.appendChild(axialButton);
    //   axialButton.addEventListener("click", function() {

    //     alert("达到最高点击次数！");

    // });
    // }

    // if (i==1){
    //   const coronalButton = createColorButton("冠状面(Coronal)", "coronal");
    //   buttonContainer.appendChild(coronalButton);
    // }
    // if (i==2){
    //   const sagittalButton = createColorButton("矢状面(Sagittal)", "sagittal");
    //   buttonContainer.appendChild(sagittalButton);
    // }

    // bottomDiv.appendChild(buttonContainer);
    bottomDiv.appendChild(slide);

    bottomDisplay.appendChild(bottomDiv);

    obj.slider = slider;
    // 为滑块添加事件监听器，当滑块值发生改变时触发
    slider.addEventListener("input", (ev) => {
      // 检查是否存在有效的图像
      const image = widget.getWidgetState().getImage();
      if (image) {
        // 获取滑块的新值（用户拖动后的数值）
        const newDistanceToP1 = ev.target.value;

        // 获取当前平面的法向量（用于表示平面的方向）
        const dirProj = widget.getWidgetState().getPlanes()[xyzToViewType[i]].normal;

        // // 获取当前平面的边界点（通常是平面的两个端点）
        const planeExtremities = widget.getPlaneExtremities(xyzToViewType[i]);

        // 计算新的平面中心点：
        // 从平面起始点 planeExtremities[0] 出发，
        // 沿法向量 dirProj 移动 newDistanceToP1 的距离
        const newCenter = vtkMath.multiplyAccumulate(
          planeExtremities[0], // 起始点
          dirProj, // 法向量
          Number(newDistanceToP1), // 滑块值转换为数字
          [] // 结果存储在一个新数组中
        );
        // 设置平面的新中心点
        widget.setCenter(newCenter);

        // 模拟用户交互，触发小部件的交互事件，确保状态更新
        obj.widgetInstance.invokeInteractionEvent(obj.widgetInstance.getActiveInteraction());

        // 遍历所有视图属性，逐一渲染每个视图以更新显示
        viewAttributes.forEach((obj2) => {
          obj2.interactor.render(); // 重新渲染视图
        });
      } else {
        // 弹出提示信息，提示用户未加载有效的图像
        alert("当前未加载有效图像，无法执行操作。");
      }
    });
  }
  // if (i==3){
  //   const bottomDiv3 = document.createElement("div")
  //   bottomDiv3.setAttribute("class", "view");
  //   bottomDiv3.style.width = "100%";
  //   bottomDiv3.style.height = "100%";
  //   bottomDiv3.innerText = "这是底部显示文本";  // 你可以修改这里的文本内容
  //   bottomDisplay.appendChild(bottomDiv3);
  // }

  // create sliders
  // if (i < 3) {
  //   const slider = document.createElement("input");
  //   slider.type = "range";
  //   slider.min = 0;
  //   slider.max = 300;
  //   slider.style.bottom = "0px";
  //   slider.style.width = "100%";
  //   elementParent.appendChild(slider);
  //   obj.slider = slider;

  //   // 为滑块添加事件监听器，当滑块值发生改变时触发
  //   slider.addEventListener("input", (ev) => {
  //     // 检查是否存在有效的图像
  //     const image = widget.getWidgetState().getImage();
  //     if (image) {
  //       // 获取滑块的新值（用户拖动后的数值）
  //       const newDistanceToP1 = ev.target.value;

  //       // 获取当前平面的法向量（用于表示平面的方向）
  //       const dirProj = widget.getWidgetState().getPlanes()[xyzToViewType[i]].normal;

  //       // // 获取当前平面的边界点（通常是平面的两个端点）
  //       const planeExtremities = widget.getPlaneExtremities(xyzToViewType[i]);

  //       // 计算新的平面中心点：
  //       // 从平面起始点 planeExtremities[0] 出发，
  //       // 沿法向量 dirProj 移动 newDistanceToP1 的距离
  //       const newCenter = vtkMath.multiplyAccumulate(
  //         planeExtremities[0], // 起始点
  //         dirProj, // 法向量
  //         Number(newDistanceToP1), // 滑块值转换为数字
  //         [] // 结果存储在一个新数组中
  //       );
  //       // 设置平面的新中心点
  //       widget.setCenter(newCenter);

  //       // 模拟用户交互，触发小部件的交互事件，确保状态更新
  //       obj.widgetInstance.invokeInteractionEvent(obj.widgetInstance.getActiveInteraction());

  //       // 遍历所有视图属性，逐一渲染每个视图以更新显示
  //       viewAttributes.forEach((obj2) => {
  //         obj2.interactor.render(); // 重新渲染视图
  //       });
  //     } else {
  //       // 弹出提示信息，提示用户未加载有效的图像
  //       alert("当前未加载有效图像，无法执行操作。");
  //     }
  //   });
  // }
}
// ----------------------------------------------------------------------------
// UI 控件处理
// ----------------------------------------------------------------------------
// 创建一个按钮的辅助函数
function createColorButton(labelText, buttonId) {
  const button = document.createElement("button");
  button.id = buttonId;
  button.textContent = labelText;
  button.style.width = "100%";
  button.style.height = "100%";
  button.style.backgroundColor = "lightgray"; // 初始颜色
  button.style.cursor = "pointer"; // 设置鼠标指针样式为“手形”，表示可以点击
  button.style.pointerEvents = "auto"; // 确保可以响应点击事件
  return button;
}
function createColorCheckbox(labelText, checkboxId) {
  const checkboxContainer = document.createElement("div");

  // Create the checkbox element
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = checkboxId;

  // Create the label element
  const label = document.createElement("label");
  label.textContent = labelText;
  label.setAttribute("for", checkboxId);

  // Style the checkbox
  checkbox.style.cursor = "pointer"; // Ensure cursor shows as "pointer" on hover

  // Optional: Style the container for layout
  checkboxContainer.style.width = "100%";
  checkboxContainer.style.height = "100%";
  checkboxContainer.style.display = "flex";
  checkboxContainer.style.alignItems = "center";
  checkboxContainer.style.justifyContent = "center";
  checkboxContainer.style.bottom = "0px";
  // Append the checkbox and label to the container
  checkboxContainer.appendChild(checkbox);
  checkboxContainer.appendChild(label);

  return checkboxContainer;
}


//-----------------------------------------矢状面--------------------------------------------------------------

// 创建切换按钮颜色的函数
function toggleButtonColor(button) {
  alert(button.style.backgroundColor);
  if (button.style.backgroundColor === "lightgray") {
    // 如果当前颜色是灰色，切换为选中颜色
    button.style.backgroundColor = "red"; // 选中颜色
  } else {
    // 如果当前颜色是选中颜色，切换为未选中颜色
    button.style.backgroundColor = "lightgray"; // 未选中颜色
  }
}
// ----------------------------------------------------------------------------
// 逻辑代码
// ----------------------------------------------------------------------------
export async function load(ArrayBuffer) {
  let arrayBuffer = [];
  for (var i = 0; i < Object.keys(ArrayBuffer).length; i++) {
    const buffer = await ArrayBuffer[i]; // Resolve each promise
    if (buffer && buffer.byteLength > 0) {
      arrayBuffer.push(buffer);
    }
  }
  return arrayBuffer;
}
/**
 * 加载 MPR 数据并渲染多切片图像。
 * @param {ArrayBuffer} arrayBuffer - 输入的二进制数据缓冲区。
 */
export function loadMPR(arrayBuffer) {
  if (!arrayBuffer) {
    // 检查输入是否有效
    throw new Error("arrayBuffer 不能为空！");
  }
  // 解析输入数据以生成图像数据和窗口设置
  let { imageData, windowWidth, windowCenter } = syntheticImageData.ImageData(arrayBuffer);

  if (!imageData) {
    // 确保解析结果有效
    throw new Error("图像数据生成失败，请检查输入的 arrayBuffer 格式是否正确。");
  }

  // 使用生成的图像数据渲染多切片图像
  MultiSliceImageMapper(imageData, windowWidth, windowCenter);

  // 可选：日志输出调试信息
  console.log(`MPR 加载完成，窗口宽度: ${windowWidth}, 窗口中心: ${windowCenter}`);
}
function MultiSliceImageMapper(imageData, windowWidth, windowCenter) {
  // 将加载的图像数据设置到一个假设的控件 `widget` 中进行显示
  widget.setImage(imageData);
  // 调用封装函数，创建一个 vtkCursor3D 边框
  display3d.setupCursor3D(view3D);
  // renderVolume(imageData, view3D);
  // 对每个视图的属性进行操作，`viewAttributes` 是包含多个视图属性的数组
  viewAttributes.forEach((obj, i) => {
    // 设置该视图的重采样输入数据为加载的图像数据
    obj.reslice.setInputData(imageData);
    const property = obj.resliceActor.getProperty();
    property.setColorWindow(windowWidth); // 设置窗口宽度
    property.setColorLevel(windowCenter); // 设置窗口中心
    // 将该视图的重采样演员添加到渲染器中
    obj.renderer.addActor(obj.resliceActor);
    // 遍历并将该视图中的球体演员添加到渲染器中
    obj.sphereActors.forEach((actor) => {
      obj.renderer.addActor(actor);
      // view3D.renderer.addActor(actor);
    });

    const reslice = obj.reslice;
    const viewType = xyzToViewType[i];
    // 对所有视图进行操作，确保在当前视图进行交互时能够正确更新切片
    viewAttributes.forEach((v) => {
      // 在交互开始时，更新重采样器的状态
      v.widgetInstance.onStartInteractionEvent(() => {
        loadimage.updateReslice(view3D, widget, widgetState, {
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
          loadimage.updateReslice(view3D, widget, widgetState, {
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
    loadimage.updateReslice(view3D, widget, widgetState, {
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
  view3D.renderWindow.render();
  // 设置最大切片数量到滑块的最大值
  const maxNumberOfSlices = vec3.length(imageData.getDimensions());
  document.getElementById("slabNumber").max = maxNumberOfSlices;
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
// ----------------------------------------------------------------------------
// 设置渲染代码
// ----------------------------------------------------------------------------
function createRGBStringFromRGBValues(rgb) {
  if (rgb.length !== 3) {
    return "rgb(0, 0, 0)";
  }
  return `rgb(${(rgb[0] * 255).toString()}, ${(rgb[1] * 255).toString()}, ${(
    rgb[2] * 255
  ).toString()})`;
}
