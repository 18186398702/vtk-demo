import "@kitware/vtk.js/favicon";

// Load the rendering pieces we want to use (for both WebGL and WebGPU)
import "@kitware/vtk.js/Rendering/Profiles/All";
import {
  xyzToViewType,
  InteractionMethodsName,
} from "@kitware/vtk.js/Widgets/Widgets3D/ResliceCursorWidget/Constants";
import SyntheticImageData from "./syntheticimage";
import Display3D from "./load3d";
import LoadImage from "./loadimage";
import MPRRendering from "./rendingmpr";
// const mprrendering = new MPRRendering();
// mprrendering.createRenderingPage();
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
  const syntheticImageData = new SyntheticImageData();
  // 解析输入数据以生成图像数据和窗口设置
  const { imageData, windowWidth, windowCenter } = syntheticImageData.ImageData(arrayBuffer);

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
  const display3d = new Display3D();
  const loadimage = new LoadImage();
  const mprrendering = new MPRRendering();
  const { viewAttributes, view3D, widget, widgetState } = mprrendering.createRenderingPage();
  const initialPlanesState = { ...widgetState.getPlanes() };
  // 将加载的图像数据设置到一个假设的控件 `widget` 中进行显示
  widget.setImage(imageData);
  // 调用封装函数，创建一个 vtkCursor3D 边框
  display3d.setupCursor3D(view3D);
  // renderVolume(imageData, view3D);
  // 对每个视图的属性进行操作，`viewAttributes` 是包含多个视图属性的数组
  viewAttributes.forEach((obj, i) => {
    // 设置该视图的重采样输入数据为加载的图像数据
    obj.reslice.setInputData(imageData);
    setColorProperties(obj, windowWidth, windowCenter);
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
  // const maxNumberOfSlices = vec3.length(imageData.getDimensions());
  // document.getElementById("slabNumber").max = maxNumberOfSlices;
  const checkboxShowRotation = document.getElementById("checkboxShowRotation");
  const checkboxRotation = document.getElementById("checkboxRotation");
  // 假设 `widget` 和 `widgetState` 已经被正确初始化
  handleCheckboxShowRotationChange(
    checkboxShowRotation,
    checkboxRotation,
    widget,
    widgetState,
    viewAttributes
  );
  const checkboxTranslation = document.getElementById("checkboxTranslation");
  // 假设 `widget` 和 `viewAttributes` 已经被正确初始化
  handleCheckboxTranslationChange(checkboxTranslation, widget, viewAttributes);
  const buttonReset = document.getElementById("buttonReset");
  // 假设 `widget`、`widgetState`、`initialPlanesState`、`view3D`、`viewAttributes` 已经被正确初始化
  handleButtonResetClick(
    buttonReset,
    widget,
    widgetState,
    initialPlanesState,
    view3D,
    viewAttributes
  );
}
// 封装函数，检查数组有效性并设置颜色窗口和颜色中心
function setColorProperties(obj, windowWidth, windowCenter) {
  const property = obj.resliceActor.getProperty();
  
  // 验证并设置窗口宽度
  if (Array.isArray(windowWidth) && windowWidth.length > 0) {
      property.setColorWindow(windowWidth[0]); // 假设使用第一个值，或者根据具体需求使用
  } else {
      console.warn("windowWidth 不是有效的数组或数组为空");
  }

  // 验证并设置窗口中心
  if (Array.isArray(windowCenter) && windowCenter.length > 0) {
      property.setColorLevel(windowCenter[0]); // 假设使用第一个值，或者根据具体需求使用
  } else {
      console.warn("windowCenter 不是有效的数组或数组为空");
  }
}

function handleButtonResetClick(
  buttonReset,
  widget,
  widgetState,
  initialPlanesState,
  view3D,
  viewAttributes
) {
  buttonReset.addEventListener("click", () => {
    // 检查是否存在有效的图像
    const image = widget.getWidgetState().getImage();
    if (image) {
      widgetState.setPlanes({ ...initialPlanesState });
      // 设置中心点为图像中心
      widget.setCenter(image.getCenter());
      updateViews(view3D, viewAttributes, widget, widgetState);
    } else {
      alert("当前未加载有效图像，无法执行重置操作。");
    }
  });
}

function updateViews(view3D, viewAttributes, widget, widgetState) {
  const loadimage = new LoadImage();
  viewAttributes.forEach((obj, i) => {
    loadimage.updateReslice(view3D, widget, widgetState, {
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
function handleCheckboxTranslationChange(checkboxTranslation, widget, viewAttributes) {
  checkboxTranslation.addEventListener("change", (ev) => {
    // 检查是否存在有效的图像
    const image = widget.getWidgetState().getImage();
    if (image) {
      viewAttributes.forEach((obj) =>
        obj.widgetInstance.setEnableTranslation(checkboxTranslation.checked)
      );
    } else {
      alert("当前未加载有效图像，无法执行平移操作。");
    }
  });
}

function handleCheckboxShowRotationChange(
  checkboxShowRotation,
  checkboxRotation,
  widget,
  widgetState,
  viewAttributes
) {
  checkboxShowRotation.addEventListener("change", (ev) => {
    // 检查是否存在有效的图像
    const image = widget.getWidgetState().getImage();
    if (image) {
      widgetState
        .getStatesWithLabel("rotation")
        .forEach((handle) => handle.setVisible(checkboxShowRotation.checked));
      viewAttributes.forEach((obj) => {
        obj.interactor.render();
      });
      checkboxRotation.checked = checkboxShowRotation.checked;
      checkboxRotation.disabled = !checkboxShowRotation.checked;
      checkboxRotation.dispatchEvent(new Event("change"));
    } else {
      alert("当前未加载有效图像，无法执行旋转操作。");
    }
  });
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
