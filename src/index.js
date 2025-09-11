// import "@kitware/vtk.js/favicon";
import vtkCoordinate from '@kitware/vtk.js/Rendering/Core/Coordinate';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkOutlineFilter from '@kitware/vtk.js/Filters/General/OutlineFilter';
import "@kitware/vtk.js/Rendering/Profiles/All";
import {
  xyzToViewType,
  InteractionMethodsName,
} from "@kitware/vtk.js/Widgets/Widgets3D/ResliceCursorWidget/Constants";
import SyntheticImageData from "./syntheticimage";
import LoadImage from "./loadimage";
import MPRRendering from "./rendingmpr";
import vtkInteractorStyle from '@kitware/vtk.js/Rendering/Core/InteractorStyle';
import vtkInteractorStyleImage from "@kitware/vtk.js/Interaction/Style/InteractorStyleImage";
import { Demo3d, load3dColor, export3dImg, change3DLightIntensity } from "./3d";
import { mat3, vec3 } from 'gl-matrix';
import vtkMatrixBuilder from '@kitware/vtk.js/Common/Core/MatrixBuilder';
import vtkMouseCameraTrackballPanManipulator from '@kitware/vtk.js/Interaction/Manipulators/MouseCameraTrackballPanManipulator';
import WindowLevelManipulator from "./WindowLevelManipulator"
import vtkMouseCameraTrackballZoomManipulator from '@kitware/vtk.js/Interaction/Manipulators/MouseCameraTrackballZoomManipulator';
import vtkInteractorStyleManipulator from '@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator';
import pageturningManipulator from "./pageturningManipulator";
import { vtk画线, drawAllLines } from "./画线";
import { calculateDistance, qn_vtk_transition } from "./qn_vtk_transition";
import { X } from '@kitware/vtk.js/Common/Core/Math/index';
export function change3dColor(color) {
  load3dColor(color)
}

export function exportImg() {
  export3dImg()
}

export function change3DLight(value) {
  change3DLightIntensity(value)
}




export async function load(ArrayBuffer) {
  let arrayBuffer = [];
  for (var i = 0; i < Object.keys(ArrayBuffer).length; i++) {
    const buffer = await ArrayBuffer[i]; // Resolve each promise
    if (buffer && buffer.byteLength > 0) {
      // console.log("arrayBuffer", buffer)
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
let eventType = 1
let viewObj = null
let callBackFun = null
let mprwidget = null
export function changeEvent(type) {
  if (!viewObj) {
    return
  }
  eventType = type
  switch (eventType) {
    case 5:
      viewObj.forEach((obj, index) => {
        const stl = vtkInteractorStyleManipulator.newInstance()
        obj.interactor.setInteractorStyle(stl);
        const panManipulator = pageturningManipulator.newInstance({
          button: 1, // 左键
          shift: false,
          control: false
        });
        const panManipulator2 = WindowLevelManipulator.newInstance({
          button: 3, // 左键
          shift: false,
          control: false
        });
        panManipulator.setSlider(obj.slider, mprwidget, viewObj, obj.widgetInstance, index)
        panManipulator2.setInteractor(obj.interactor, index)
        stl.addMouseManipulator(panManipulator2);
        stl.addMouseManipulator(panManipulator);
      })
      break
    case 1:
      viewObj.forEach((obj, index) => {
        const stl = vtkInteractorStyleManipulator.newInstance()
        obj.interactor.setInteractorStyle(stl);
        // 2. 添加自定义平移操纵器（左键拖动）
        const panManipulator = WindowLevelManipulator.newInstance({
          button: 1, // 左键
          shift: false,
          control: false
        });
        const panManipulator2 = WindowLevelManipulator.newInstance({
          button: 3, // 左键
          shift: false,
          control: false
        });
        panManipulator.setInteractor(obj.interactor, index)
        panManipulator2.setInteractor(obj.interactor, index)
        stl.addMouseManipulator(panManipulator2);
        stl.addMouseManipulator(panManipulator);
      })
      break;
    case 2:
      viewObj.forEach((obj, index) => {
        const stl = vtkInteractorStyleManipulator.newInstance()
        obj.interactor.setInteractorStyle(stl);
        // 2. 添加自定义平移操纵器（左键拖动）
        const panManipulator = vtkMouseCameraTrackballPanManipulator.newInstance({
          button: 1, // 左键
          shift: false,
          control: false
        });
        const panManipulator2 = WindowLevelManipulator.newInstance({
          button: 3, // 左键
          shift: false,
          control: false
        });
        panManipulator2.setInteractor(obj.interactor, index)
        stl.addMouseManipulator(panManipulator2);
        stl.addMouseManipulator(panManipulator);
      })
      break
    case 3:
      viewObj.forEach((obj, index) => {
        const stl = vtkInteractorStyleManipulator.newInstance()
        obj.interactor.setInteractorStyle(stl);
        // 2. 添加自定义平移操纵器（左键拖动）
        const panManipulator = vtkMouseCameraTrackballZoomManipulator.newInstance({
          button: 1, // 左键
          shift: false,
          control: false
        });
        const panManipulator2 = WindowLevelManipulator.newInstance({
          button: 3, // 左键
          shift: false,
          control: false
        });
        panManipulator2.setInteractor(obj.interactor, index)
        stl.addMouseManipulator(panManipulator2);
        stl.addMouseManipulator(panManipulator);
      })
      break;
    case 4:
      viewObj.forEach(obj => {
        const stl = vtkInteractorStyleManipulator.newInstance()
        obj.interactor.setInteractorStyle(stl);
      })
      break;
  }
  const canvas1 = document.getElementById('scmpr22_11');
  const canvas2 = document.getElementById('scmpr22_12');
  const canva3 = document.getElementById('scmpr22_21');
  if (canvas1) {
    canvas1.style.pointerEvents = eventType == 4 ? 'auto' : 'none';
  }
  if (canvas2) {
    canvas2.style.pointerEvents = eventType == 4 ? 'auto' : 'none';
  }
  if (canva3) {
    canva3.style.pointerEvents = eventType == 4 ? 'auto' : 'none';
  }
}

function dx处理(arrayBuffer) {
  for (let i = 0; i < arrayBuffer.length; i++) {
    if (arrayBuffer[i].h_img && arrayBuffer[i].h_img.dx != 0) {
      var arrayBuffer_temp = new Int16Array(arrayBuffer[i].h_img.data.length)
      arrayBuffer_temp = Int16Array.from(arrayBuffer[i].h_img.data, num => num + arrayBuffer[i].h_img.dx);
      arrayBuffer[i].h_img.data = arrayBuffer_temp
      arrayBuffer[i].window_l = arrayBuffer[i].window_l + arrayBuffer[i].h_img.dx
    }
  }
  arrayBuffer.sort((a, b) => a.image_position[2] - b.image_position[2])
  //计算层间距
  for (let i = 0; i < arrayBuffer.length; i++) {
    var sliceSpacing = 0;
    if (i === 0 && arrayBuffer.length > 1) {
      // 第一张图像：使用与下一张的间距
      sliceSpacing = Math.abs(arrayBuffer[i + 1].image_position[2] - arrayBuffer[i].image_position[2]);
    } else if (i === arrayBuffer.length - 1 && arrayBuffer.length > 1) {
      // 最后一张图像：使用与上一张的间距
      sliceSpacing = Math.abs(arrayBuffer[i].image_position[2] - arrayBuffer[i - 1].image_position[2]);
    } else if (i > 0 && i < arrayBuffer.length - 1) {
      // 中间图像：计算前后平均间距，更准确
      const prevSpacing = Math.abs(arrayBuffer[i].image_position[2] - arrayBuffer[i - 1].image_position[2]);
      const nextSpacing = Math.abs(arrayBuffer[i + 1].image_position[2] - arrayBuffer[i].image_position[2]);
      sliceSpacing = (prevSpacing + nextSpacing) / 2;
    } else {
      // 只有一张图像，无法计算间距
      sliceSpacing = 0;
    }

    // 添加到对象中
    arrayBuffer[i].slice_spacing = parseFloat(sliceSpacing.toFixed(6)); // 保留6位小数
  }
}

export function load3D(arrayBuffer, divElement) {
  if (!arrayBuffer) {
    // 检查输入是否有效
    throw new Error("arrayBuffer 不能为空！");
  }
  dx处理(arrayBuffer)
  const syntheticImageData = new SyntheticImageData();
  const { imageData, windowWidth, windowCenter } = syntheticImageData.ImageData(arrayBuffer)
  Demo3d(imageData, divElement)
}




/**
 * 测的
 * @param [] arrayBuffer dicom序列数据
 * @param dom divElement mpr呈现的容器
 * @param function qingniaoJSCallback 回调函数
 */
let default_windowWidth, default_windowCenter;
export function loadMPR(arrayBuffer, divElement, qingniaoJSCallback) {
  if (!arrayBuffer) {
    // 检查输入是否有效
    throw new Error("arrayBuffer 不能为空！");
  }
  dx处理(arrayBuffer)
  const syntheticImageData = new SyntheticImageData();
  const { imageData, windowWidth, windowCenter } = syntheticImageData.ImageData(arrayBuffer)
  default_windowWidth = windowWidth
  default_windowCenter = windowCenter
  callBackFun = qingniaoJSCallback
  MultiSliceImageMapper(imageData, windowWidth, windowCenter, divElement, qingniaoJSCallback)
  // vtk画线()
  changeEvent(5)
  let Dom3d = document.getElementById('VTK-image-div-3');
  Demo3d(imageData, Dom3d, "1")
}


function MultiSliceImageMapper(imageData, windowWidth, windowCenter, divElement, qingniaoJSCallback) {
  const loadimage = new LoadImage();
  const mprrendering = new MPRRendering();
  const { viewAttributes, view3D, widget, widgetState } = mprrendering.createRenderingPage(divElement, qingniaoJSCallback);
  viewObj = viewAttributes
  // 将加载的图像数据设置到一个假设的控件 `widget` 中进行显示
  // console.log(imageData)
  mprwidget = widget;
  widget.setImage(imageData);
  const outline = vtkOutlineFilter.newInstance();
  outline.setInputData(imageData);
  const outlineMapper = vtkMapper.newInstance();
  outlineMapper.setInputData(outline.getOutputData());
  const outlineActor = vtkActor.newInstance();
  outlineActor.setMapper(outlineMapper);
  // view3D.renderer.addActor(outlineActor);
  // 对每个视图的属性进行操作，`viewAttributes` 是包含多个视图属性的数组
  viewAttributes.forEach((obj, i) => {
    // 设置该视图的重采样输入数据为加载的图像数据
    obj.reslice.setInputData(imageData);
    setColorProperties(obj, i, windowWidth, windowCenter);
    // 将该视图的重采样演员添加到渲染器中
    obj.renderer.addActor(obj.resliceActor);

    // view3D.renderer.addActor(obj.resliceActor);
    // 遍历并将该视图中的球体演员添加到渲染器中
    obj.sphereActors.forEach((actor) => {
      obj.renderer.addActor(actor);
      // view3D.renderer.addActor(actor);
    });
    let mouseDrawing = false;
    // let startX, startY;
    // let currentLine = null;
    let previousPosition = {};
    let preCameraScale = obj.renderer.getActiveCamera().getParallelScale();
    // obj.interactor.onMouseEnter((e) => {
    //   console.log("鼠标进入")
    // })

    obj.interactor.onMouseMove((e) => {
      if (!mouseDrawing) return;
      if (eventType == 2) {
        const currentPosition = e.position;
        // 计算鼠标移动的增量
        let deltaX = currentPosition.x - previousPosition.x;
        let deltaY = currentPosition.y - previousPosition.y;
        previousPosition = JSON.parse(JSON.stringify(currentPosition));
        let vtkdiv = document.getElementById("VTK-image-div-" + i);
        let vtkCanvas = vtkdiv.querySelector("canvas")
        let 画线canvas = document.getElementById(i == 0 ? "scmpr22_11" : (i == 1 ? "scmpr22_12" : "scmpr22_21"));
        if (画线canvas && callBackFun) {
          console.log("移动回调", vtkCanvas.width, 画线canvas.width)
          callBackFun(2, { x: deltaX / (vtkCanvas.width / 画线canvas.width), y: -deltaY / (vtkCanvas.height / 画线canvas.height) }, "VTK-image-div-" + i);
          // callBackFun(i, deltaX / (vtkCanvas.width / 画线canvas.width), -deltaY / (vtkCanvas.width / 画线canvas.width))
        }
      }
      if (eventType == 3) {
        const currentScale = obj.renderer.getActiveCamera().getParallelScale();
        let scaleChange = preCameraScale / currentScale;
        preCameraScale = currentScale;
        if (callBackFun) {
          callBackFun(3, { scale: scaleChange }, "VTK-image-div-" + i);
          // callBackFun(i, 0, 0, scaleChange)
        }
      }

      if (eventType == 4) {
      }
    })
    obj.interactor.onLeftButtonRelease((e) => {
      // 输出camera
      // const camera = obj.renderer.getActiveCamera()
      // console.log(camera, camera.get())
      // const imageData = obj.reslice.getOutputData()
      // const image = imageData.getPointData().getScalars().getData();
      // console.log(image)
      // console.log(widget.getWidgetState())
      // console.log(obj.resliceMapper.get(), obj.resliceMapper.getSlice(), obj.resliceMapper.getSliceAtFocalPoint(), obj.resliceMapper.getSlicingMode(), obj.resliceMapper.getSlicingModeNormal())
      // console.log(imageData.getDimensions(), imageData.getSpacing(), imageData.getBounds())
      mouseDrawing = false;
      // currentLine = null;
    })
    obj.interactor.onLeftButtonPress((e) => {
      mouseDrawing = true;
      if (eventType == 2) {
        previousPosition = e.position;
      }
      if (eventType == 3) {
        preCameraScale = obj.renderer.getActiveCamera().getParallelScale();
      }

      if (eventType == 4) {
      }
    })
    // obj.widgetInstance.onWidgetChange((e) => {
    // console.log(obj.widgetInstance)
    // console.log('actor', obj.renderer.getActors()[0].get());
    // const displayPos = e.position;
    // const worldPos = screenToWorld(displayPos, obj.renderer);
    // console.log('World Position:', worldPos);
    // const hoveredView = e.pokedRenderer;
    // console.log("事件视图", hoveredView)
    // widgetState.getStatesWithLabel("line").forEach((state) => {
    //   // 判断是激活状态
    //   if (state.getActive()) {
    //     // console.log('HoverEvent', e);
    //     state.setScale3(2.5, 2.5, 1000);
    //   } else {
    //     state.setScale3(1, 1, 1000)
    //   }
    // })
    // })

    const reslice = obj.reslice;
    const viewType = xyzToViewType[i];
    // 对所有视图进行操作，确保在当前视图进行交互时能够正确更新切片
    viewAttributes.forEach((v) => {

      // v.widgetInstance.onWidgetChange((event) => {
      //   console.log("事件类型", event)
      // })

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
            computeFocalPointOffset: true,
            sphereSources: obj.sphereSources,
            slider: obj.slider,
            mapper: obj.resliceMapper
          }, qingniaoJSCallback);
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
      mapper: obj.resliceMapper
    });
    // 渲染当前视图
    const image = obj.reslice.getOutputData()
    const boundsX = image.getBounds()[1] > image.getBounds()[3] ? image.getBounds()[1] : image.getBounds()[3]
    obj.renderer.getActiveCamera().setParallelScale(boundsX / 2);
    obj.interactor.render();

  });
  // 重置 3D 渲染器的相机，确保视图显示正确
  // view3D.renderer.resetCamera();
  // 重置相机的裁剪范围
  // view3D.renderer.resetCameraClippingRange();
  // view3D.renderWindow.render();

}
// 封装函数，检查数组有效性并设置颜色窗口和颜色中心
function setColorProperties(obj, i, windowWidth, windowCenter) {
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
  const doc = document.getElementById("mpr-window-level-div-" + i);
  if (doc)
    doc.innerHTML = `W: ${windowWidth.toFixed(0)} / L: ${windowCenter.toFixed(0)}`;
}

export async function changeMPRWindowLevel(windowWidth, windowCenter) {
  if (!windowWidth && !windowCenter) {
    windowWidth = default_windowWidth;
    windowCenter = default_windowCenter;
  }
  viewObj.forEach((obj, index) => {
    setColorProperties(obj, index, windowWidth, windowCenter)
    obj.interactor.render();
  })
}

export async function f_load_directory(selectFiles) {
  const dicom_arraybuffer = [];

  // 按文件名排序确保顺序
  const sortedFiles = [...selectFiles].sort((a, b) =>
    parseInt(a.name) - parseInt(b.name)
  );

  for (const file of sortedFiles) {
    try {
      const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (evt) => resolve(evt.target.result);
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
      });
      dicom_arraybuffer.push(arrayBuffer);
    } catch (err) {
      console.error(`读取文件 ${file.name} 失败:`, err);
      // 可以选择继续处理其他文件或抛出错误
    }
  }

  return dicom_arraybuffer;
}

/**
 * Canvas和VTK之间的转换处理函数
 * @param {number} renderer_num - 画布序号: 0，1，2
 * @returns {Object} 倍数的字符串(canvas/vtk)
 */
export function get_Multiple_by_renderer(renderer_num) {
  if (!viewObj[renderer_num]) {
    return
  }
  //模拟点击点
  let x_len = 100;
  let sj_x_len = calculateDistance({ x: 0, y: 0 }, { x: x_len, y: 0 }, viewObj[renderer_num].renderer);
  let x_Multiple = sj_x_len / x_len;

  let y_len = 100;
  let sj_y_len = calculateDistance({ x: 0, y: 0 }, { x: 0, y: y_len }, viewObj[renderer_num].renderer);
  let y_Multiple = sj_y_len / y_len;

  return x_Multiple.toString() + "\\" + y_Multiple.toString()
}


/**
 * Canvas和VTK之间的转换处理函数
 * @param {number} pro_type - 操作模式: 1-切图, 2-平移, 3-缩放
 * @param {Object} data - 相关操作数据
 * @param {Array} draw_record - 绘制记录数据(可选)
 * @returns {Object} 处理结果
 */
export function zuobiao_transition(pro_type, data, draw_record) {
  return qn_vtk_transition(pro_type, data, draw_record)
}