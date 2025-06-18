// import "@kitware/vtk.js/favicon";
import vtkCoordinate from '@kitware/vtk.js/Rendering/Core/Coordinate';

import vtkGenericRenderWindow from "@kitware/vtk.js/Rendering/Misc/GenericRenderWindow";
import vtkWidgetManager from "@kitware/vtk.js/Widgets/Core/WidgetManager";
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
import vtkVolume from "@kitware/vtk.js/Rendering/Core/Volume";
import vtkVolumeMapper from "@kitware/vtk.js/Rendering/Core/VolumeMapper";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkBoundingBox from "@kitware/vtk.js/Common/DataModel/BoundingBox";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkPiecewiseFunction from "@kitware/vtk.js/Common/DataModel/PiecewiseFunction";
import vtkVolumeProperty from "@kitware/vtk.js/Rendering/Core/VolumeProperty";
import vtkImageMapper from "@kitware/vtk.js/Rendering/Core/ImageMapper";
import vtkImageReslice from "@kitware/vtk.js/Imaging/Core/ImageReslice";
import vtkImageSlice from "@kitware/vtk.js/Rendering/Core/ImageSlice";
import vtkResliceCursorWidget from "@kitware/vtk.js/Widgets/Widgets3D/ResliceCursorWidget";
import { w } from '@kitware/vtk.js/macros2';
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
export function loadDicom(arrayBuffer) {
  const syntheticImageData = new SyntheticImageData();
  // const {pixelSpacing,SliceThickness,WindowCenter,WindowWidth,HitBit} = syntheticImageData.GetTagsData(arrayBuffer)
  // return {
  //   pixelSpacing:pixelSpacing,
  //   SliceThickness:SliceThickness,
  //   WindowCenter:WindowCenter,
  //   WindowWidth:WindowWidth,
  //   HitBit:HitBit
  //   }
  const hit = syntheticImageData.GetHitBitData(arrayBuffer)
  return hit
}

export function load3D(arrayBuffer) {
  if (!arrayBuffer) {
    // 检查输入是否有效
    throw new Error("arrayBuffer 不能为空！");
  }
  const syntheticImageData = new SyntheticImageData();
  const { imageData, windowWidth, windowCenter } = syntheticImageData.ImageData(arrayBuffer)
  Demo3d(imageData)
}

function Demo3d(source) {
  const renderMainBox = document.getElementById("test1");
  const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
    container: renderMainBox,
    background: [0, 0, 0],
  });
  const renderer = fullScreenRenderer.getRenderer();
  const renderWindow = fullScreenRenderer.getRenderWindow();
  const volume = vtkVolume.newInstance();
  const mapper = vtkVolumeMapper.newInstance();

  mapper.setInputData(source);
  volume.setMapper(mapper);

  const sampleDistance =
    0.7 *
    Math.sqrt(
      source
        .getSpacing()
        .map((v) => v * v)
        .reduce((a, b) => a + b, 0)
    );
  mapper.setSampleDistance(sampleDistance);
  mapper.setComputeNormalFromOpacity(false);
  mapper.setGlobalIlluminationReach(0.0);
  mapper.setVolumetricScatteringBlending(0.5);
  mapper.setVolumeShadowSamplingDistFactor(5.0);

  const volProp = vtkVolumeProperty.newInstance();
  volProp.setInterpolationTypeToLinear();
  volume
    .getProperty()
    .setScalarOpacityUnitDistance(
      0,
      vtkBoundingBox.getDiagonalLength(source.getBounds()) /
      Math.max(...source.getDimensions())
    );
  volProp.setGradientOpacityMinimumValue(0, 0);
  const dataArray =
    source.getPointData().getScalars() ||
    source.getPointData().getArrays()[0];
  const dataRange = dataArray.getRange();
  volume
    .getProperty()
    .setGradientOpacityMaximumValue(
      0,
      (dataRange[1] - dataRange[0]) * 0.05
    );
  volProp.setShade(true);
  volProp.setUseGradientOpacity(0, false);
  volProp.setGradientOpacityMinimumOpacity(0, 0.0);
  volProp.setGradientOpacityMaximumOpacity(0, 1.0);
  // volProp.setAmbient(0.0);
  volProp.setDiffuse(2.0);
  volProp.setSpecular(0.0);
  volProp.setSpecularPower(0.0);
  volProp.setUseLabelOutline(false);
  // volProp.setLabelOutlineThickness(2);
  volume.setProperty(volProp);

  const cam = renderer.getActiveCamera();
  cam.setPosition(0, 0, 0);
  cam.setFocalPoint(-1, -1, 0);
  cam.setViewUp(0, 0, -1);

  renderer.addVolume(volume);
  const pf = vtkPiecewiseFunction.newInstance();
  pf.addPoint(0, 0.0);
  pf.addPoint(100, 0.0);
  pf.addPoint(3120, 1.0);
  volume.getProperty().setScalarOpacity(0, pf);

  const ctf = vtkColorTransferFunction.newInstance();
  ctf.addRGBPoint(200.0, 1.0, 1.0, 1.0);
  ctf.addRGBPoint(2000.0, 1.0, 1.0, 1.0);

  volume.getProperty().setRGBTransferFunction(0, ctf);

  renderer.resetCamera();
  renderer.resetCameraClippingRange();
  renderWindow.render();
}


/**
 * 测的
 * @param {} arrayBuffer 
 */

export function loadMPR(arrayBuffer) {
  if (!arrayBuffer) {
    // 检查输入是否有效
    throw new Error("arrayBuffer 不能为空！");
  }
  const syntheticImageData = new SyntheticImageData();
  const { imageData, windowWidth, windowCenter } = syntheticImageData.ImageData(arrayBuffer)
  console.log("imageData", imageData, windowWidth, windowCenter)
  const axialCanvas = document.getElementById('axial');
  const coronalCanvas = document.getElementById('coronal');
  const sagittalCanvas = document.getElementById('sagittal');
  const widget = vtkResliceCursorWidget.newInstance();
  const widgetState = widget.getWidgetState();
  widget.setImage(imageData);
  let objArr = []
  const createVTIObject = (canvas, imageData, widget, viewtype) => {
    let obj = { viewtype: viewtype }
    obj.reslice = vtkImageReslice.newInstance();
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
    obj.resliceMapper.setSliceAtFocalPoint(true); // 确保切片在焦点处
    // 将 vtkImageReslice 的输出连接到映射器，确保映射器能渲染重切割后的图像
    obj.resliceMapper.setInputConnection(obj.reslice.getOutputPort());
    // 创建一个 vtkImageSlice 实例，用于显示图像切片
    obj.resliceActor = vtkImageSlice.newInstance();
    // 将映射器应用到 vtkImageSlice 上，以便它能够渲染图像
    obj.resliceActor.setMapper(obj.resliceMapper);
    obj.reslice.setInputData(imageData);
    const grw = vtkGenericRenderWindow.newInstance();
    const render = grw.getRenderer()

    obj.widgetManager = vtkWidgetManager.newInstance()
    obj.widgetManager.setRenderer(render);
    obj.widgetInstance = obj.widgetManager.addWidget(widget, viewtype);
    obj.widgetInstance.setKeepOrthogonality(true);
    const ctx = canvas.getContext('2d');
    //canvas加监听点击事件
    canvas.addEventListener('click', function (e) {
      // 获取点击位置的坐标
      const x = e.clientX;
      const y = e.clientY;
      // 获取 canvas 元素的边界信息
      const rect = canvas.getBoundingClientRect();
      // 计算点击位置的 X 和 Y 坐标（相对于 canvas）
      const xCanvas = x - rect.left;
      const yCanvas = y - rect.top;
      console.log(viewtype, xCanvas, yCanvas);
      let center = widget.get().widgetState.getCenter();
      console.log("center", widget, widget.get().widgetState.getRotationHandleXinY0(), widget.get().widgetState.getCenter());
      console.log("widgetInstance", obj.widgetInstance)
      if (obj.viewtype == 4) {
        center[1] = xCanvas;
        center[2] = yCanvas;
      } else if (obj.viewtype == 5) {
        center[0] = xCanvas;
        center[2] = yCanvas;
      } else {
        center[0] = xCanvas;
        center[1] = yCanvas;
      }
      // widget.setCenter(center);
      obj.widgetInstance.rotateLineInView("YinX", -Math.PI / 4)
      obj.widgetInstance.rotateLineInView("YinZ", -Math.PI / 4)
      // obj.widgetInstance.rotateLineInView("YinX", 90)
      //  obj.widgetInstance.invokeInteractionEvent("rotateLine")
      updateMPR(widget, objArr, center, windowWidth, windowCenter);
    })
    obj.ctx = ctx;
    objArr.push(obj)
  }
  createVTIObject(axialCanvas, imageData, widget, 4)
  createVTIObject(coronalCanvas, imageData, widget, 5)
  createVTIObject(sagittalCanvas, imageData, widget, 6)
  console.log(widgetState.getCenter())
  let center = [200.801, 200.801, 22]
  widget.setCenter(center);
  let otherLineHandle = objArr[0].widgetInstance.getOtherLineHandle("XinY")
  let otherLineVector = otherLineHandle.getDirection()
  console.log("XinY", otherLineVector)
  otherLineHandle = objArr[0].widgetInstance.getOtherLineHandle("ZinY")
  otherLineVector = otherLineHandle.getDirection()
  console.log("ZinY", otherLineVector)
  otherLineHandle = objArr[0].widgetInstance.getOtherLineHandle("ZinX")
  otherLineVector = otherLineHandle.getDirection()
  console.log("ZinX", otherLineVector)
  otherLineHandle = objArr[0].widgetInstance.getOtherLineHandle("YinX")
  otherLineVector = otherLineHandle.getDirection()
  console.log("YinX", otherLineVector)
  otherLineHandle = objArr[0].widgetInstance.getOtherLineHandle("XinZ")
  otherLineVector = otherLineHandle.getDirection()
  console.log("XinZ", otherLineVector)
  otherLineHandle = objArr[0].widgetInstance.getOtherLineHandle("YinZ")
  otherLineVector = otherLineHandle.getDirection()
  console.log("YinZ", otherLineVector)
  // widget.get().widgetState.setRotationHandleXinY0(45)
  console.log("widget", widget.get())
  console.log("objArr", widget.get().behavior, widget.get().widgetState.getStatesWithLabel('rotation'))
  console.log(widget.get().widgetState.getStatesWithLabel("sphere")[1].getState())
  //  widget.get().widgetState.getStatesWithLabel('rotation')[0].setOffset()
  updateMPR(widget, objArr, center, windowWidth, windowCenter)
  console.log("widgetState", widgetState, widgetState.getCenter(), widgetState.getAxisXinY().get());
  MultiSliceImageMapper(imageData, windowWidth, windowCenter)
}
function dicom_to_8byte_from_hight_byte_at_ww_wl(pixdate, wl_y, ww) {
  //计算最小值
  var min = Math.min(pixdate);
  //拨正
  var wl = wl_y;
  if (min < 0) {
    for (var pix_num = 0; pix_num < pixdate.length; pix_num++) {
      pixdate[pix_num] = pixdate[pix_num] - min;
    }
    var wl = wl_y - min;
  }

  const window_min = (wl - ww / 2);
  const window_max = (wl + ww / 2);
  const ww_wl_a = (255 / ww);
  const ww_wl_b = ((window_min * 255) / ww);
  var lut = new Uint8ClampedArray(65536);
  var lueLenght = lut.length
  for (var i = 0; i < lueLenght; i++) {
    if (i < window_min) {
      lut[i] = 0;
    } else if (i > window_max) {
      lut[i] = 255;
    } else {
      lut[i] = parseInt(i * ww_wl_a - ww_wl_b);
    }
  }

  const pixdataLenght = pixdate.length
  var pixUint8ArrTC = new Uint8Array(pixdataLenght * 4)
  for (var a = 0, b = 0; a < pixdataLenght; a++) {
    let lut_val = lut[pixdate[a]];
    if (lut_val == undefined) {
      lut_val = lut[Math.round(pixdate[a])];
    }
    pixUint8ArrTC[b] = pixUint8ArrTC[b + 1] = pixUint8ArrTC[b + 2] = lut_val;
    pixUint8ArrTC[b + 3] = 255;
    b += 4;
  }
  return pixUint8ArrTC
}
function updateMPR(widget, objArr, center, windowWidth, windowCenter) {
  for (let obj of objArr) {
    const modified = widget.updateReslicePlane(
      obj.reslice,
      obj.viewtype
    );
    let resliceAxes = obj.reslice.getResliceAxes();
    obj.resliceActor.setUserMatrix(resliceAxes);
    const imageData2 = obj.reslice.getOutputData()
    const image = imageData2.getPointData().getScalars().getData();
    const width = imageData2.getDimensions()[0];
    const height = imageData2.getDimensions()[1];
    const bounds = obj.resliceActor.getBounds();
    const spacing = imageData2.getSpacing()
    console.log(obj.viewtype, imageData2.getDimensions(), imageData2.getSpacing(), obj.resliceActor.getBounds())
    //计算切片像素
    const displayX = bounds[1] - bounds[0];  // X轴方向显示宽度
    const displayY = bounds[3] - bounds[2]; // Y轴方向显示高度
    const displayZ = bounds[5] - bounds[4]; // Y轴方向显示高度
    let imgwidth = 0
    let imgheight = 0
    let linesX = 0
    let linesY = 0

    imgwidth = width * spacing[0];
    imgheight = height * spacing[1];
    if (obj.viewtype == 4) {
      // imgwidth = displayY;
      // imgheight = displayZ;
      linesX = center[1]
      linesY = center[2]
    } else if (obj.viewtype == 5) {
      // imgwidth = displayX;
      // imgheight = displayZ;
      linesX = center[0]
      linesY = center[2]
    } else {
      // imgwidth = displayX;
      // imgheight = displayY;
      linesX = center[0]
      linesY = center[1]
    }
    console.log(image)
    const rgbaBuffer = dicom_to_8byte_from_hight_byte_at_ww_wl(image, windowCenter, windowWidth)

    // let buffer = new Uint8ClampedArray(image)
    // console.log(buffer)
    // const normalizedData = new Uint8ClampedArray(image);

    // console.log(normalizedData)
    // const rgbaBuffer = new Uint8ClampedArray(width * height * 4);
    // for (let i = 0; i < normalizedData.length; i++) {
    //   rgbaBuffer[i * 4] = normalizedData[i]
    //   rgbaBuffer[i * 4 + 1] = normalizedData[i]; // G
    //   rgbaBuffer[i * 4 + 2] = normalizedData[i]; // B
    //   rgbaBuffer[i * 4 + 3] = 255;     // A
    // }
    console.log(rgbaBuffer)
    const imageDataObj = new ImageData(new Uint8ClampedArray(rgbaBuffer), width, height);

    // 创建临时Canvas存放ImageData
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageDataObj, 0, 0);
    let ctx = obj.ctx;
    ctx.clearRect(0, 0, 520, 520);
    ctx.drawImage(tempCanvas, 0, 0, width, height, 0, 0, imgwidth, imgheight);
    ctx.strokeStyle = 'orange';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(linesX, 0);
    ctx.lineTo(linesX, 520);
    ctx.moveTo(0, linesY);
    ctx.lineTo(520, linesY);
    ctx.stroke();
  }
}
function MultiSliceImageMapper(imageData, windowWidth, windowCenter) {
  const loadimage = new LoadImage();
  const mprrendering = new MPRRendering();
  const { viewAttributes, view3D, widget, widgetState } = mprrendering.createRenderingPage();
  // 将加载的图像数据设置到一个假设的控件 `widget` 中进行显示
  // console.log(imageData)
  widget.setImage(imageData);
  // 调用封装函数，创建一个 vtkCursor3D 边框
  // display3d.setupCursor3D(view3D);
  // renderVolume(imageData, view3D);
  // 对每个视图的属性进行操作，`viewAttributes` 是包含多个视图属性的数组
  console.log(viewAttributes)
  viewAttributes.forEach((obj, i) => {
    // 设置该视图的重采样输入数据为加载的图像数据
    obj.reslice.setInputData(imageData);
    setColorProperties(obj, windowWidth, windowCenter);
    // 将该视图的重采样演员添加到渲染器中
    obj.renderer.addActor(obj.resliceActor);
    // 遍历并将该视图中的球体演员添加到渲染器中
    obj.sphereActors.forEach((actor) => {
      // obj.renderer.addActor(actor);
      // view3D.renderer.addActor(actor);
    });
    obj.interactor.handleMouseMove((e) => {
      console.log(e)
    })
    obj.interactor.onLeftButtonPress((e) => {
      console.log(obj.interactor)
      let center = widgetState.getCenter();
      console.log("center", center)
      let otherLineHandle = obj.widgetInstance.getOtherLineHandle("XinY")
      let otherLineVector = otherLineHandle.getDirection()
      console.log("XinY", otherLineVector)
      otherLineHandle = obj.widgetInstance.getOtherLineHandle("ZinY")
      otherLineVector = otherLineHandle.getDirection()
      console.log("ZinY", otherLineVector)
      otherLineHandle = obj.widgetInstance.getOtherLineHandle("ZinX")
      otherLineVector = otherLineHandle.getDirection()
      console.log("ZinX", otherLineVector)
      otherLineHandle = obj.widgetInstance.getOtherLineHandle("YinX")
      otherLineVector = otherLineHandle.getDirection()
      console.log("YinX", otherLineVector)
      otherLineHandle = obj.widgetInstance.getOtherLineHandle("XinZ")
      otherLineVector = otherLineHandle.getDirection()
      console.log("XinZ", otherLineVector)
      otherLineHandle = obj.widgetInstance.getOtherLineHandle("YinZ")
      otherLineVector = otherLineHandle.getDirection()
      console.log("YinZ", otherLineVector)
      const imageData2 = obj.reslice.getOutputData()
      console.log(imageData2)
      const image = imageData2.getPointData().getScalars().getData();
      console.log(image)
      // obj.widgetInstance.rotateLineInView("YinX", 90)
      // loadimage.updateReslice(view3D, widget, widgetState, {
      //   viewType,
      //   reslice,
      //   actor: obj.resliceActor,
      //   renderer: obj.renderer,
      //   resetFocalPoint: false,
      //   computeFocalPointOffset: false,
      //   sphereSources: obj.sphereSources,
      //   slider: obj.slider,
      // });
      // const bounds = obj.resliceActor.getBounds();  // 返回 [xMin, xMax, yMin, yMax, zMin, zMax]

      console.log(obj.resliceActor);

      let img = obj.reslice.getOutputData()
      console.log(img, img.getDimensions())

    })
    obj.widgetInstance.onWidgetChange((e) => {
      // console.log(obj.widgetInstance)
      // console.log('actor', obj.renderer.getActors()[0].get());
      // const displayPos = e.position;
      // const worldPos = screenToWorld(displayPos, obj.renderer);
      // console.log('World Position:', worldPos);
      // const hoveredView = e.pokedRenderer;
      // console.log("事件视图", hoveredView)
      widgetState.getStatesWithLabel("line").forEach((state) => {
        // 判断是激活状态
        if (state.getActive()) {
          // console.log('HoverEvent', e);
          state.setScale3(2.5, 2.5, 1000);
        } else {
          state.setScale3(1, 1, 1000)
        }
      })
    })

    // obj.renderer.getActiveCamera().setParallelScale(currentScale * 0.5); 
    // console.log(obj.renderer.getActiveCamera().getParallelScale())
    const reslice = obj.reslice;
    const viewType = xyzToViewType[i];
    console.log(xyzToViewType)
    // 对所有视图进行操作，确保在当前视图进行交互时能够正确更新切片
    viewAttributes.forEach((v) => {

      v.widgetInstance.onWidgetChange((event) => {

        // console.log("事件类型", event)
      })
      // 在交互开始时，更新重采样器的状态
      // v.widgetInstance.onStartInteractionEvent(() => {
      //   loadimage.updateReslice(view3D, widget, widgetState, {
      //     viewType,
      //     reslice,
      //     actor: obj.resliceActor,
      //     renderer: obj.renderer,
      //     resetFocalPoint: false, // 交互开始时不重置焦点位置
      //     computeFocalPointOffset: true, // 允许计算焦点偏移
      //     sphereSources: obj.sphereSources,
      //     slider: obj.slider,
      //   });
      // });

      // 在交互过程中，更新切片的位置和焦点
      v.widgetInstance.onInteractionEvent(
        // 可以根据当前交互方法判断是否允许更新焦点
        (interactionMethodName) => {
          console.log("interactionMethodName", interactionMethodName)
          const canUpdateFocalPoint = interactionMethodName === InteractionMethodsName.RotateLine;
          const activeViewType = widget.getWidgetState().getActiveViewType();
          // 如果当前视图是活动视图或不能更新焦点，则允许计算焦点偏移
          console.log("activeViewType", activeViewType, canUpdateFocalPoint)
          const computeFocalPointOffset = activeViewType === viewType || !canUpdateFocalPoint;
          console.log("computeFocalPointOffset", computeFocalPointOffset)
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

}
// 封装函数，检查数组有效性并设置颜色窗口和颜色中心
function setColorProperties(obj, windowWidth, windowCenter) {
  const property = obj.resliceActor.getProperty();

  // 验证并设置窗口宽度，确保是整数类型
  if (Number.isInteger(windowWidth)) {
    property.setColorWindow(windowWidth);
  } else {
    console.warn("windowWidth 不是有效的整数");
  }

  // 验证并设置窗口中心，确保是整数类型
  if (Number.isInteger(windowCenter)) {
    property.setColorLevel(windowCenter);
  } else {
    console.warn("windowCenter 不是有效的整数");
  }
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