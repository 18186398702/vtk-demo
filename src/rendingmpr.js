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
import Display3D from "./load3d";
class MPRRendering {
  // 创建MPR渲染页面
  createRenderingPage() {
    // 定义视图颜色（X轴、Y轴、Z轴以及其他方向的灰色）
    const viewColors = [
      [1, 0, 0], // 红色，表示X轴
      [0, 1, 0], // 绿色，表示Y轴
      [0, 0, 1], // 蓝色，表示Z轴
      [0.5, 0.5, 0.5], // 灰色，表示其他
    ];
    // 是否显示调试Actor（用于开发阶段查看Actor）
    const debugActors = true;

    // 定义光标样式，用于控制不同操作时的光标表现
    const cursorStyles = {
      translateCenter: "move", // 中心平移时的光标样式
      rotateLine: "alias", // 旋转线条时的光标样式
      translateAxis: "pointer", // 平移轴时的光标样式
      default: "default", // 默认光标样式
    };

    // 调用布局设置函数，传入必要的参数，并返回视图属性和3D视图对象
    const { viewAttributes, view3D, widget, widgetState } = this.setupLayoutForMPR(
      viewColors,
      debugActors,
      cursorStyles
    );

    // 返回渲染页面所需的视图属性和3D视图对象
    return { viewAttributes, view3D, widget, widgetState };
  }

  // 设置MPR布局的函数
  setupLayoutForMPR(viewColors, showDebugActors, appCursorStyles) {
    const viewAttributes = [];
    let view3D = null;
    const display3d = new Display3D();
    // 创建vtk的ResliceCursor Widget实例
    const widget = vtkResliceCursorWidget.newInstance();
    const widgetState = widget.getWidgetState();
    widgetState.getStatesWithLabel("sphere").forEach((handle) => handle.setScale1(20));
    const checkboxTranslation = document.getElementById("checkboxTranslation");
    const checkboxShowRotation = document.getElementById("checkboxShowRotation");
    const checkboxRotation = document.getElementById("checkboxRotation");
    const checkboxOrthogonality = document.getElementById("checkboxOrthogonality");
    // 获取容器元素并设置样式
    const container = document.getElementById("container");
    // 调用封装函数并获取控制面板容器
    const controlContainer = this.createControlPanel();
    // 将创建的控制面板容器添加到页面中的父容器
    container.appendChild(controlContainer);
    // controlContainer.style.border = "2px solid black"; // 2px 宽的黑色实线边框
    container.appendChild(controlContainer);
    const { createdElements, createdSliderElements } = this.createViewWithButtons(
      controlContainer,
      4
    );
    // 通过访问 createdViews 数组来操作这些视图元素
    createdElements.forEach((element, i) => {
      // 例如，修改第一个视图的背景颜色
      if (i === 0) {
        element.style.backgroundColor = "lightblue";
      }
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
        faceColor: this.createRGBStringFromRGBValues(viewColors[0]),
        faceRotation: 0,
        edgeThickness: 0.1,
        edgeColor: "black",
        resolution: 400,
      });
      // axes.setXPlusFaceProperty({ text: '+X' });
      axes.setXMinusFaceProperty({
        text: "-X",
        faceColor: this.createRGBStringFromRGBValues(viewColors[0]),
        faceRotation: 90,
        fontStyle: "italic",
      });
      axes.setYPlusFaceProperty({
        text: "+Y",
        faceColor: this.createRGBStringFromRGBValues(viewColors[1]),
        fontSizeScale: (res) => res / 4,
      });
      axes.setYMinusFaceProperty({
        text: "-Y",
        faceColor: this.createRGBStringFromRGBValues(viewColors[1]),
        fontColor: "white",
      });
      axes.setZPlusFaceProperty({
        text: "+Z",
        faceColor: this.createRGBStringFromRGBValues(viewColors[2]),
      });
      axes.setZMinusFaceProperty({
        text: "-Z",
        faceColor: this.createRGBStringFromRGBValues(viewColors[2]),
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
      if (i < 3) {
        obj.slider = createdSliderElements[i];
        // 为滑块添加事件监听器，当滑块值发生改变时触发
        createdSliderElements[i].addEventListener("input", (ev) => {
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
    });
    // 返回视图属性和3D视图对象
    return { viewAttributes, view3D, widget, widgetState };
  }
  // 封装函数：创建并返回控制面板容器
  createControlPanel() {
    // 创建控制面板容器
    const controlContainer = document.createElement("div");

    // 设置容器的样式
    controlContainer.style.padding = "0%"; // 设置内边距，增加一些间距
    controlContainer.style.width = "100%";
    controlContainer.style.minHeight = "100%"; // 设置最小高度，容器高度至少为 300px
    controlContainer.style.textAlign = "center"; // 文本居中显示
    controlContainer.style.flexShrink = "0"; // 防止控制容器收缩

    // 设置父容器为flex布局，支持换行
    controlContainer.style.display = "flex";
    controlContainer.style.flexWrap = "wrap"; // 允许换行
    controlContainer.style.justifyContent = "space-between"; // 分布空间

    // 取消或打开边框（可选）
    // controlContainer.style.border = "2px solid black"; // 2px 宽的黑色实线边框

    // 返回创建的控制面板容器
    return controlContainer;
  }

  // 封装函数，创建视图容器并添加按钮，返回创建的元素
  createViewWithButtons(controlContainer, numElements = 4) {
    const createdElements = []; // 用于存储创建的元素
    const createdSliderElements = [];
    for (let i = 0; i < numElements; i++) {
      // 创建父级容器，放置视图和按钮
      const elementParent = document.createElement("div");
      elementParent.style.width = "49.7%";
      elementParent.style.height = "100%";
      elementParent.style.display = "inline-block";
      controlContainer.appendChild(elementParent);

      // 创建图像容器
      const elementImage = document.createElement("div");
      elementImage.style.width = "100%";
      elementImage.style.height = "90%";
      //   elementImage.style.border = "1px solid black"; // 可选，便于调试
      elementParent.appendChild(elementImage);

      // 创建按钮容器
      const elementbutton = document.createElement("div");
      elementbutton.style.width = "100%";
      elementbutton.style.height = "10%";
      elementbutton.style.display = "flex";
      elementParent.appendChild(elementbutton);

      // 创建按钮的左右部分
      //   const elementleft = document.createElement("div");
      //   elementleft.style.width = "40%";
      //   elementleft.style.height = "100%";
      //   elementleft.style.border = "1px solid red"; // 可选，便于调试
      const elementright = document.createElement("div");
      elementright.style.width = "100%";
      elementright.style.height = "100%";
      elementright.style.display = "flex";
      //   elementright.style.border = "1px solid red"; // 可选，便于调试
      //   elementbutton.appendChild(elementleft);
      if (i < 3) {
        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = 0;
        slider.max = 300;
        slider.style.bottom = "0px";
        slider.style.width = "100%";
        elementright.appendChild(slider);
        createdSliderElements.push(slider);
      }
      elementbutton.appendChild(elementright);

      // 创建按钮并添加到左侧部分
      //   const axialButton = this.createColorButton("Axial", "axial_" + i); // 每个按钮的 id 保持唯一
      //   elementleft.appendChild(axialButton);
      //   axialButton.addEventListener("click", function () {
      //     alert("达到最高点击次数！");
      //   });

      // 将创建的 elementParent 存储在数组中
      createdElements.push(elementImage);
    }

    // 返回包含所有创建元素的数组
    return { createdElements, createdSliderElements };
  }
  // 创建一个按钮的辅助函数
  createColorButton(labelText, buttonId) {
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

  createRGBStringFromRGBValues(rgb) {
    if (rgb.length !== 3) {
      return "rgb(0, 0, 0)";
    }
    return `rgb(${(rgb[0] * 255).toString()}, ${(rgb[1] * 255).toString()}, ${(
      rgb[2] * 255
    ).toString()})`;
  }
}
//   elementParent.innerText = "这是底部显示文本"; // 你可以修改这里的文本内容
//   elementParent.style.border = "1px solid black"; // 2px 宽的黑色实线边框
// 导出类
export default MPRRendering;
