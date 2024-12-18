import daikon from "./halo_200804";
import validateInputs from "./data/validate";
import createImageData from "./data/createImage";

import "@kitware/vtk.js/favicon";
import "@kitware/vtk.js/Rendering/Profiles/All";
import vtkGenericRenderWindow from "@kitware/vtk.js/Rendering/Misc/GenericRenderWindow";
import vtkImageReslice from "@kitware/vtk.js/Imaging/Core/ImageReslice";
import vtkMatrixBuilder from "@kitware/vtk.js/Common/Core/MatrixBuilder";
import vtkImageMapper from "@kitware/vtk.js/Rendering/Core/ImageMapper";
import vtkImageSlice from "@kitware/vtk.js/Rendering/Core/ImageSlice";

// import createImageData from "./data/createImage"
export async function loadMPR(dicomInfo, controlId) {
  // console.log("data",dicomInfo, sliderIds, containerIds);
  // 调用验证函数
  let data = await validateInputs(dicomInfo, controlId);
  let imageData = createImageData(data);

  const planeConfigs = [
    { axis: "z", rotation: { x: 0, y: 0, z: 0 }, origin: [0, 0, 30] }, // 横断面
    { axis: "y", rotation: { x: 90, y: 0, z: 0 }, origin: [0, 50, 0] }, // 冠状面
    { axis: "x", rotation: { x: 0, y: 90, z: 0 }, origin: [20, 0, 0] }, // 矢状面
  ];
  // 初始化每个视图和交叉线
  const resliceInstances = [];
  const sliceOrigins = planeConfigs.map((config) => [...config.origin]);
  // 从 controlId 解构出 sliderIds 和 containerIds
  const { slider: { sliderIds } = {}, container: { containerIds } = {} } = controlId;
  // 初始化每个平面视图
  containerIds.forEach((containerId, index) => {
    const config = planeConfigs[index];
    const element = document.getElementById(containerId);

    // 创建渲染窗口
    const grw = vtkGenericRenderWindow.newInstance({ background: [0, 0, 0] });
    grw.setContainer(element);
    grw.resize();
    const renderer = grw.getRenderer();
    const renderWindow = grw.getRenderWindow();
    const interactor = grw.getInteractor(); // 获取交互器对象，用于处理用户输入（例如鼠标操作）
    renderWindow.setInteractor(interactor); // 设置交互器与渲染窗口关联，确保用户能够与窗口进行交互
    interactor.initialize(); // 初始化交互器，准备开始与用户的交互
    interactor.bindEvents(element); // 绑定事件到 HTML 元素，使得用户可以通过鼠标和键盘与视图进行交互

    // 创建 Reslice
    const reslice = vtkImageReslice.newInstance();
    reslice.setInputData(imageData);
    reslice.setOutputDimensionality(2);

    // 设置初始变换矩阵
    const resliceAxes = vtkMatrixBuilder
      .buildFromDegree()
      .identity()
      .translate(...config.origin)
      .rotateX(config.rotation.x)
      .rotateY(config.rotation.y)
      .rotateZ(config.rotation.z)
      .getMatrix();
    reslice.setResliceAxes(resliceAxes);

    // 创建 Mapper 和 Actor
    const mapper = vtkImageMapper.newInstance();
    mapper.setInputConnection(reslice.getOutputPort());
    const imageActorI = vtkImageSlice.newInstance();
    imageActorI.setMapper(mapper);
    // 添加 Actor 到渲染器
    renderer.addActor(imageActorI);
    // 保存实例
    resliceInstances.push({
      reslice,
      renderWindow,
      renderer,
      axis: config.axis,
      rotation: config.rotation,
    });
    // 渲染初始视图
    renderer.resetCamera();
    renderWindow.render();
  });

  // 添加滑块事件监听器
  sliderIds.forEach((sliderId, index) => {
    const slider = document.getElementById(sliderId);
    slider.addEventListener("input", (event) => {
      const value = Number(event.target.value);
      const { reslice, renderWindow, axis, rotation } = resliceInstances[index];

      // 动态生成新的变换矩阵
      const origin = [...sliceOrigins[index]]; // 复制当前原点
      if (axis === "x") origin[0] = value;
      else if (axis === "y") origin[1] = value;
      else if (axis === "z") origin[2] = value;

      const newResliceAxes = vtkMatrixBuilder
        .buildFromDegree()
        .identity()
        .translate(...origin)
        .rotateX(rotation.x)
        .rotateY(rotation.y)
        .rotateZ(rotation.z)
        .getMatrix();

      reslice.setResliceAxes(newResliceAxes);
      renderWindow.render();

      // 更新原点记录
      sliceOrigins[index] = origin;
    });
  });

  console.log("data", data);
}
export async function getTags(dicomArrayBuffer) {
  let dicom_tags = [];
  if (dicomArrayBuffer.length == 0) {
    console.error("获取文件buffer为空,不支持获取tags数据");
  } else {
    for (var i = 0; i < Object.keys(dicomArrayBuffer).length; i++) {
      try {
        const buffer = await dicomArrayBuffer[i]; // Resolve each promise
        if (buffer && buffer.byteLength > 0) {
          // 检查是否有数据
          const data_a = new DataView(buffer);
          daikon.Parser.verbose = true;
          const dicom_data = daikon.Series.parseImage(data_a);
          dicom_tags.push(dicom_data);
        } else {
          console.warn(`Buffer at index ${i} is empty or invalid`);
        }
      } catch (error) {
        console.error("处理 DICOM 数据时出错:", error);
      }
    }
  }
  return dicom_tags;
}
export async function processTagsInfo(tagsData, dicomTags) {
  let allTags = [];
  if (Object.keys(dicomTags).length === 0) {
    console.error("入参为空");
  }
  try {
    const dicom = await tagsData; // Resolve each promise
    for (var i = 0; i < Object.keys(dicom).length; i++) {
      let tagsInfo = {};
      for (const key in dicomTags) {
        const tag = dicomTags[key];
        const idWithoutComma = tag.id.replace(/,/g, ""); // 去除逗号
        let info = {};
        if (idWithoutComma == "7FE00010") {
          var hit_bit = dicom[i].getInterpretedData(false, true);
          Object.assign(info, { ID: idWithoutComma, Description: hit_bit });
          tagsInfo[key] = info;
        }
        if (idWithoutComma in dicom[i].tags && idWithoutComma != "7FE00010") {
          Object.assign(info, {
            ID: idWithoutComma,
            Description: dicom[i].tags[idWithoutComma].value,
          });
          tagsInfo[key] = info;
        }
      }
      allTags.push(tagsInfo);
    }
  } catch (error) {
    console.error("处理 tags 数据时出错:", error);
  }

  // console.log("allTags",allTags);
  return allTags;
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
