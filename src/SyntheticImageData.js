import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";
import daikon from "./halo_200804";
class SyntheticImageData {
  ImageData(arrayBuffer) {
    // 创建一个新的 vtkImageData 实例，用于存储体数据
    const imageData = vtkImageData.newInstance();

    // 解析第一个 DICOM 文件的数据，获取基础元信息
    const dicom_data = parseDicomData(arrayBuffer[0]);

    // 获取 DICOM 文件中的像素间距 (Pixel Spacing)
    const pixel_spacing = dicom_data.tags["00280030"].value;

    // 获取 DICOM 文件中的切片厚度 (Slice Thickness)
    const slice_thickness = dicom_data.tags["00180050"].value;

    // 获取窗宽 (Window Width) 和窗位 (Window Center) 信息
    const window_center = dicom_data.tags["00281050"].value;
    const window_width = dicom_data.tags["00281051"].value;

    // 获取 DICOM 文件中的像素数据，并解析出其位深 (bit depth)
    const hit_bit = dicom_data.getInterpretedData(false, true);

    // 根据像素数据确定数据类型（如 Int16、Uint8 等）
    const data_type = getType(hit_bit.data);

    // 设置图像的维度信息：列数、行数以及切片数
    const dimensions = [hit_bit.numCols, hit_bit.numRows, arrayBuffer.length];

    // 设置图像的间距信息，包括像素间距和切片厚度
    const spacing = [pixel_spacing[0], pixel_spacing[1], slice_thickness[0]];

    // 设置 vtkImageData 的间距、原点和维度
    imageData.setSpacing(spacing);
    imageData.setOrigin([0, 0, 0]);
    imageData.setDimensions(...dimensions);
    const scalarArray = createScalarArrayFromDICOM(arrayBuffer, dimensions, data_type);
    // 将像素数据绑定到 vtkImageData 的点数据（PointData）中
    imageData.getPointData().setScalars(scalarArray);

    // 返回处理后的 vtkImageData 对象，以及窗宽和窗位信息
    return {
      imageData: imageData,
      windowWidth: window_width,
      windowCenter: window_center,
    };
  }
}
/*
 * 将多个 DICOM 文件解析并转换为 vtkDataArray 对象
 * @param {ArrayBuffer[]} arrayBuffer - 包含多个 DICOM 文件的字节数组
 * @param {Array} dimensions - 图像的维度信息 [numCols, numRows, numSlices]
 * @param {string} data_type - 像素数据类型（如 Int16、Uint8 等）
 * @returns {vtkDataArray} - 包含像素数据的 vtkDataArray 对象
 */
function createScalarArrayFromDICOM(arrayBuffer, dimensions, data_type) {
    // 初始化一个类型为 Float32Array 的数组，用于存储所有切片的像素数据
    // const typedPixelArray = new Float32Array(dimensions[0] * dimensions[1] * arrayBuffer.length);
    const typedPixelArray = createTypedArray(data_type, dimensions, arrayBuffer.length);

    // 遍历每个 DICOM 文件，提取其像素数据并写入 typedPixelArray
    arrayBuffer.forEach((buffer, index) => {
        const dicomdata = parseDicomData(buffer); // 解析当前切片数据
        const hitbit = dicomdata.getInterpretedData(false, true); // 获取当前切片的像素数据
        const sliceOffset = dimensions[0] * dimensions[1] * index; // 计算切片在总体数据中的偏移量
        typedPixelArray.set(hitbit.data, sliceOffset); // 将当前切片数据填充到对应位置
    });

    // 创建 vtkDataArray 对象，用于将像素数据与 vtkImageData 关联
    return vtkDataArray.newInstance({
        name: "Pixels", // 数据的名称
        dataType: data_type, // 数据类型（如 Int16、Uint8 等）
        numberOfComponents: 1, // 每个像素的分量数（单通道图像为 1）
        values: typedPixelArray, // 像素数据
    });
}

// 封装读取和解析 DICOM 数据的函数
function parseDicomData(arrayBuffer) {
  // 创建一个 DataView 来读取 ArrayBuffer 数据
  const dataView = new DataView(arrayBuffer);

  // 关闭 daikon 的详细日志输出，提高性能
  daikon.Parser.verbose = false;

  // 使用 daikon 解析图像数据
  const dicomData = daikon.Series.parseImage(dataView);

  // 返回解析结果
  return dicomData;
}
/**
 * 创建一个指定类型的类型化数组，支持指定维度和长度。
 * @param {string} type - 类型化数组的类型（例如："Int8Array"、"Float32Array"）。
 * @param {number[]} dimensions - 数组的维度（例如：[行数, 列数]）。
 * @param {number} length - 长度的附加倍数，用于扩展总大小。
 * @returns {TypedArray} - 创建的类型化数组。
 * @throws {Error} - 如果提供了未知类型或无效的维度或长度。
 */
 function createTypedArray(type, dimensions, length) {
    // 输入参数校验
    if (!Array.isArray(dimensions) || dimensions.length !== 3) {
        // 检查维度是否为数组，并且包含两个数值
        throw new Error("无效的维度：必须是一个包含两个数字的数组，例如 [行数, 列数]。");
    }
    if (typeof length !== "number" || length <= 0) {
        // 检查长度是否为正数
        throw new Error("无效的长度：长度必须是一个正数。");
    }

    // 计算数组的总大小
    const totalSize = dimensions[0] * dimensions[1] * length;

    // 检查总大小是否有效
    if (totalSize <= 0) {
        throw new Error("无效的总大小：维度和长度的乘积必须是正数。");
    }

    // 根据指定的类型创建类型化数组
    switch (type) {
        case "Int8Array":
            return new Int8Array(totalSize); // 创建 Int8Array
        case "Uint8Array":
            return new Uint8Array(totalSize); // 创建 Uint8Array
        case "Uint8ClampedArray":
            return new Uint8ClampedArray(totalSize); // 创建 Uint8ClampedArray
        case "Int16Array":
            return new Int16Array(totalSize); // 创建 Int16Array
        case "Uint16Array":
            return new Uint16Array(totalSize); // 创建 Uint16Array
        case "Int32Array":
            return new Int32Array(totalSize); // 创建 Int32Array
        case "Uint32Array":
            return new Uint32Array(totalSize); // 创建 Uint32Array
        case "Float32Array":
            return new Float32Array(totalSize); // 创建 Float32Array
        case "Float64Array":
            return new Float64Array(totalSize); // 创建 Float64Array
        case "BigInt64Array":
            return new BigInt64Array(totalSize); // 创建 BigInt64Array
        case "BigUint64Array":
            return new BigUint64Array(totalSize); // 创建 BigUint64Array
        default:
            // 如果类型不匹配，抛出错误
            throw new Error(`未知的类型化数组类型：${type}`);
    }
}
function getType(value) {
  return Object.prototype.toString.call(value).slice(8, -1);
}

// 导出类
export default SyntheticImageData;
// const dicomTags = {
//     imagePositionPatient: {
//       id: "0020,0032", //图像在患者坐标系中的位置
//       description: "Image Position (Patient)",
//     },
//     imageOrientationPatient: {
//       id: "0020,0037", //图像方向矩阵
//       description: "Image Orientation (Patient)",
//     },
//     pixelSpacing: {
//       id: "0028,0030", //像素的物理间距
//       description: "Pixel Spacing",
//     },
//     sliceThickness: {
//       id: "0018,0050", //切片厚度
//       description: "Slice Thickness",
//     },
//     instanceNumber: {
//       id: "0020,0013", //当前影像序号
//       description: "Instance Number",
//     },
//     sopInstanceUID: {
//       id: "0008,0018", //唯一标识影像的
//       UIDdescription: "SOP Instance UID",
//     },
//     rescaleIntercept: {
//       id: "0028,1052", //像素值的物理转换截距
//       description: "Rescale Intercept",
//     },
//     rescaleSlope: {
//       id: "0028,1053", //像素值的物理转换斜率
//       description: "Rescale Slope",
//     },
//     pixelData: {
//       id: "7FE0,0010", //实际影像像素数据
//       description: "Pixel Data",
//     },
//     windowCenter: {
//       id: "0028,1050",
//       description: "Window Center",
//     },
//     windowWidth: {
//       id: "0028,1051",
//       description: "Window Width",
//     },
//   };
