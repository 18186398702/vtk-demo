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
import vtkMouseCameraTrackballZoomManipulator from '@kitware/vtk.js/Interaction/Manipulators/MouseCameraTrackballZoomManipulator';
import vtkInteractorStyleManipulator from '@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator';
import windowlevelStyle from "./windowlevelStyle";
export function change3dColor(color) {
  load3dColor(color)
}

export function exportImg() {
  export3dImg()
}

export function change3DLight(value) {
  change3DLightIntensity(value)
}

function calculateB(a) {
  // 根据给定的数据点，使用分段线性回归进行近似
  // 我们将数据点分为几个区间，每个区间使用不同的线性方程
  // 数据点排序
  const dataPoints = [
    { a: 450, b: 0.45 },
    { a: 270, b: 0.68 },
    { a: 225, b: 0.9 },
    { a: 135, b: 1.48 }
  ];
  // 对数据点进行排序
  dataPoints.sort((a, b) => a.a - b.a);
  // 找到输入值 a 所在的区间
  for (let i = 0; i < dataPoints.length - 1; i++) {
    const point1 = dataPoints[i];
    const point2 = dataPoints[i + 1];
    if (a >= point1.a && a <= point2.a) {
      // 计算斜率和截距
      const slope = (point2.b - point1.b) / (point2.a - point1.a);
      const intercept = point1.b - slope * point1.a;
      // 使用线性插值计算b值
      return slope * a + intercept;
    }
  }
  // 如果a超出所有数据点的范围，返回最近的数据点
  if (a < dataPoints[0].a) return dataPoints[0].b;
  if (a > dataPoints[dataPoints.length - 1].a) return dataPoints[dataPoints.length - 1].b;
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
export function changeEvent(type) {
  eventType = type
  switch (eventType) {
    case 1:
      viewObj.forEach(obj => {
        obj.interactor.setInteractorStyle(windowlevelStyle.newInstance());
      })
      break;
    case 2:
      console.log("changeEvent", eventType)
      viewObj.forEach(obj => {
        const stl = vtkInteractorStyleManipulator.newInstance()
        obj.interactor.setInteractorStyle(stl);
        // 2. 添加自定义平移操纵器（左键拖动）
        const panManipulator = vtkMouseCameraTrackballPanManipulator.newInstance({
          button: 1, // 左键
          shift: false,
          control: false
        });
        stl.addMouseManipulator(panManipulator);
      })
      break
    case 3:
      viewObj.forEach(obj => {
        const stl = vtkInteractorStyleManipulator.newInstance()
        obj.interactor.setInteractorStyle(stl);
        // 2. 添加自定义平移操纵器（左键拖动）
        const panManipulator = vtkMouseCameraTrackballZoomManipulator.newInstance({
          button: 1, // 左键
          shift: false,
        })
        stl.addMouseManipulator(panManipulator);
      })
      break;
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
}

export function load3D(arrayBuffer, divElement) {
  if (!arrayBuffer) {
    // 检查输入是否有效
    throw new Error("arrayBuffer 不能为空！");
  }
  dx处理(arrayBuffer)
  console.log("arrayBuffer", arrayBuffer)
  const syntheticImageData = new SyntheticImageData();
  const { imageData, windowWidth, windowCenter } = syntheticImageData.ImageData(arrayBuffer)
  Demo3d(imageData, divElement)
}




/**
 * 测的
 * @param {} arrayBuffer 
 */

export function loadMPR(arrayBuffer, divElement) {
  // for (let i = 0; i < arrayBuffer.length; i++) {
  //   if (arrayBuffer[i].h_img && arrayBuffer[i].h_img.dx != 0) {
  //     arrayBuffer[i].h_img.data = arrayBuffer[i].h_img.data.map(num => num + arrayBuffer[i].h_img.dx)
  //   }
  // }
  console.log("loadMPR", arrayBuffer)
  if (!arrayBuffer) {
    // 检查输入是否有效
    throw new Error("arrayBuffer 不能为空！");
  }
  dx处理(arrayBuffer)
  const syntheticImageData = new SyntheticImageData();
  const { imageData, windowWidth, windowCenter } = syntheticImageData.ImageData(arrayBuffer)
  MultiSliceImageMapper(imageData, windowWidth, windowCenter, divElement)
}


function MultiSliceImageMapper(imageData, windowWidth, windowCenter, divElement) {
  const loadimage = new LoadImage();
  const mprrendering = new MPRRendering();
  const { viewAttributes, view3D, widget, widgetState } = mprrendering.createRenderingPage(divElement);
  viewObj = viewAttributes
  // 将加载的图像数据设置到一个假设的控件 `widget` 中进行显示
  // console.log(imageData)
  widget.setImage(imageData);
  const outline = vtkOutlineFilter.newInstance();
  outline.setInputData(imageData);
  const outlineMapper = vtkMapper.newInstance();
  outlineMapper.setInputData(outline.getOutputData());
  const outlineActor = vtkActor.newInstance();
  outlineActor.setMapper(outlineMapper);
  view3D.renderer.addActor(outlineActor);
  // 对每个视图的属性进行操作，`viewAttributes` 是包含多个视图属性的数组
  viewAttributes.forEach((obj, i) => {
    // 设置该视图的重采样输入数据为加载的图像数据
    obj.reslice.setInputData(imageData);
    setColorProperties(obj, windowWidth, windowCenter);
    // 将该视图的重采样演员添加到渲染器中
    obj.renderer.addActor(obj.resliceActor);
    if (i == 0) {
      console.log("i")
      const cam = obj.renderer.getActiveCamera();
      console.log(cam)
    }
    view3D.renderer.addActor(obj.resliceActor);
    // 遍历并将该视图中的球体演员添加到渲染器中
    obj.sphereActors.forEach((actor) => {
      obj.renderer.addActor(actor);
      view3D.renderer.addActor(actor);
    });
    console.log(obj.interactor)
    let mouseDrawing = false;
    let startX, startY;
    let currentLine = null;
    let previousPosition = {};
    const container = obj.grw.getContainer();
    const svg = container.querySelector('svg');
    // 获得svg实际高度
    const svgHeight = svg.height.baseVal.value;
    obj.interactor.onMouseEnter((e) => {
      console.log("鼠标进入")
    })
    obj.interactor.onMouseMove((e) => {
      if (!mouseDrawing) return;
      // if (eventType == 2) {
      //   const currentPosition = e.position;
      //   const renderer = obj.renderer;
      //   const camera = renderer.getActiveCamera();
      //   // 计算鼠标移动的增量
      //   let deltaX = currentPosition.x - previousPosition.x;
      //   let deltaY = currentPosition.y - previousPosition.y;
      //   previousPosition = JSON.parse(JSON.stringify(currentPosition));
      //   // 根据相机缩放尺寸合理平移相机位置
      //   let scale = camera.getParallelScale()
      //   // let bl = 160 / scale
      //   let canvasH = container.offsetHeight
      //   console.log(canvasH, calculateB(canvasH))
      //   let bl = calculateB(canvasH) * scale / 200
      //   deltaX = -deltaX * bl;
      //   deltaY = deltaY * bl;
      //   console.log(deltaX, deltaY)
      //   if (i == 0) {
      //     camera.translate(0, deltaX, -deltaY);
      //   } else if (i == 1) {
      //     camera.translate(deltaX, 0, -deltaY);
      //   } else {
      //     camera.translate(deltaX, deltaY, 0);
      //   }

      //   renderer.resetCameraClippingRange();
      //   obj.interactor.render();
      // }
      if (eventType == 3) {
        //   const currentPosition = e.position;
        //   const renderer = obj.renderer;
        //   const camera = renderer.getActiveCamera();
        //   const deltaY = currentPosition.y - previousPosition.y;
        //   previousPosition = JSON.parse(JSON.stringify(currentPosition));
        //   // 缩放相机
        //   console.log(camera)
        //   let scale = camera.getParallelScale()
        //   console.log(camera.getPhysicalScale())
        //   scale -= deltaY * 0.5
        //   if (scale < 1) {
        //     scale = 1
        //   }
        //   console.log(scale)
        //   camera.setParallelScale(scale);

        //   renderer.resetCameraClippingRange();
        //   obj.interactor.render();
      }

      if (eventType == 4) {
        currentLine.setAttribute('x2', e.position.x / 1.8);
        currentLine.setAttribute('y2', svgHeight - e.position.y / 1.8);
      }
    })
    obj.interactor.onLeftButtonRelease((e) => {
      // 输出camera
      const camera = obj.renderer.getActiveCamera()
      console.log(camera, camera.get())
      // 获取表示对象
      const imageData = obj.reslice.getOutputData()
      console.log(imageData.getDimensions(), imageData.getSpacing(), imageData.getBounds())
      mouseDrawing = false;
      currentLine = null;
    })
    obj.interactor.onLeftButtonPress((e) => {
      mouseDrawing = true;
      // if (eventType == 2) {
      //   previousPosition = e.position;
      // }
      if (eventType == 3) {
        previousPosition = e.position;
      }

      if (eventType == 4) {

        startX = e.position.x / 1.8;
        startY = svgHeight - e.position.y / 1.8;
        currentLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        currentLine.setAttribute('stroke', '#ff0000');
        currentLine.setAttribute('stroke-width', '2');
        currentLine.setAttribute('x1', startX);
        currentLine.setAttribute('y1', startY);
        currentLine.setAttribute('x2', startX);
        currentLine.setAttribute('y2', startY);
        svg.appendChild(currentLine);
      }

      // 创建SVG线条元素

      // let center = widgetState.getCenter();
      // console.log("center", center)
      // let otherLineHandle = obj.widgetInstance.getOtherLineHandle("XinY")
      // let otherLineVector = otherLineHandle.getDirection()
      // console.log("XinY", otherLineVector)
      // otherLineHandle = obj.widgetInstance.getOtherLineHandle("ZinY")
      // otherLineVector = otherLineHandle.getDirection()
      // console.log("ZinY", otherLineVector)
      // otherLineHandle = obj.widgetInstance.getOtherLineHandle("ZinX")
      // otherLineVector = otherLineHandle.getDirection()
      // console.log("ZinX", otherLineVector)
      // otherLineHandle = obj.widgetInstance.getOtherLineHandle("YinX")
      // otherLineVector = otherLineHandle.getDirection()
      // console.log("YinX", otherLineVector)
      // otherLineHandle = obj.widgetInstance.getOtherLineHandle("XinZ")
      // otherLineVector = otherLineHandle.getDirection()
      // console.log("XinZ", otherLineVector)
      // otherLineHandle = obj.widgetInstance.getOtherLineHandle("YinZ")
      // otherLineVector = otherLineHandle.getDirection()
      // console.log("YinZ", otherLineVector)
      // const imageData2 = obj.reslice.getOutputData()
      // console.log(imageData2)
      // const image = imageData2.getPointData().getScalars().getData();
      // console.log(image)
      // console.log(obj.resliceActor);

      // let img = obj.reslice.getOutputData()
      // console.log(img, img.getDimensions())

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
            computeFocalPointOffset: true,
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
    const image = obj.reslice.getOutputData()
    const boundsX = image.getBounds()[1] > image.getBounds()[3] ? image.getBounds()[1] : image.getBounds()[3]
    obj.renderer.getActiveCamera().setParallelScale(boundsX / 1.95);
    obj.interactor.render();

  });
  // 重置 3D 渲染器的相机，确保视图显示正确
  view3D.renderer.resetCamera();
  // 重置相机的裁剪范围
  view3D.renderer.resetCameraClippingRange();
  view3D.renderWindow.render();

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

export async function changeMPRWindowLevel(windowWidth, windowCenter) {
  console.log(windowWidth, windowCenter)
  viewObj.forEach((obj) => {
    setColorProperties(obj, windowWidth, windowCenter)
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


