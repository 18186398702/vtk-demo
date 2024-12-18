// 配置文件，定义 DICOM 加载和渲染所需的参数
export const CONFIG = {
    planeConfigs: [ // 平面配置
      { name: "Axial", axis: "z", rotation: { x: 0, y: 0, z: 0 }, origin: [0, 0, 30] },
      { name: "Coronal", axis: "y", rotation: { x: 90, y: 0, z: 0 }, origin: [0, 50, 0] },
      { name: "Sagittal", axis: "x", rotation: { x: 0, y: 90, z: 0 }, origin: [20, 0, 0] },
    ]
  };
  