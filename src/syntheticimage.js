import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";
import daikon from "./halo_200804";
class SyntheticImageData {
  ImageData1(arrayBuffer) {
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
  ImageData(hitbit) {
    // 创建一个新的 vtkImageData 实例，用于存储体数据
    const imageData = vtkImageData.newInstance();
    console.log(hitbit[0]);
    const zeroHit = hitbit[0];
    // 根据像素数据确定数据类型（如 Int16、Uint8 等）
    const data_type = getType(zeroHit.h_img.data);
    // 设置图像的维度信息：列数、行数以及切片数
    const dimensions = [zeroHit.h_img.numCols, zeroHit.h_img.numRows, hitbit.length];
    // 设置图像的间距信息，包括像素间距和切片厚度
    const spacing = [zeroHit.pixSpacing, zeroHit.pixSpacing, zeroHit.slice_Thickness];
    // 设置 vtkImageData 的间距、原点和维度
    imageData.setSpacing(spacing);
    imageData.setOrigin([0, 0, 0]);
    imageData.setDimensions(...dimensions);
    //imageData.setExtent(0, 127, 0, 127, 0, 127);
    const typedPixelArray = createTypedArray(data_type, dimensions, hitbit.length);
    hitbit.forEach((buffer, index) => {
      const sliceOffset = dimensions[0] * dimensions[1] * index;
      typedPixelArray.set(buffer.h_img.data, sliceOffset);
    });
    const scalarArray = vtkDataArray.newInstance({
      name: "Pixels", // 数据的名称
      dataType: data_type, // 数据类型（如 Int16、Uint8 等）
      numberOfComponents: 1, // 每个像素的分量数（单通道图像为 1）
      values: typedPixelArray, // 像素数据
    });
    // 将像素数据绑定到 vtkImageData 的点数据（PointData）中
    imageData.getPointData().setScalars(scalarArray);
    // 返回处理后的 vtkImageData 对象，以及窗宽和窗位信息
    return {
      imageData: imageData,
      windowWidth: zeroHit.window_w,
      windowCenter: zeroHit.window_l,
    };
  }
  SyntheticImage(dicomData) {
    // 创建一个新的 vtkImageData 实例，用于存储体数据
    const imageData = vtkImageData.newInstance();
    try {
      this.validateDicomData(dicomData); // 如果数据有效
      let length = Object.keys(dicomData.hitbit).length;
      // 设置图像的维度信息：列数、行数以及切片数
      const dimensions = [
        dicomData.hitbit.property0.numCols,
        dicomData.hitbit.property0.numRows,
        length,
      ];

      //   // 设置图像的间距信息，包括像素间距和切片厚度
      const spacing = [
        dicomData.pixelSpacing[0],
        dicomData.pixelSpacing[1],
        dicomData.sliceThickness[0],
      ];

      // 设置 vtkImageData 的间距、原点和维度
      imageData.setSpacing(spacing);
      imageData.setOrigin([0, 0, 0]);
      imageData.setDimensions(...dimensions);
      // 将像素数据绑定到 vtkImageData 的点数据（PointData）中
      imageData.getPointData().setScalars(scalarArray);
    } catch (error) {
      console.error("数据验证失败:", error); // 如果抛出异常，则捕获并打印错误信息
    }

    // 返回处理后的 vtkImageData 对象，以及窗宽和窗位信息
    return {
      imageData: imageData,
      windowWidth: dicomData.windowWidth,
      windowCenter: dicomData.windowCenter,
    };
  }
  validateDicomData(dicomData) {
    // 验证 pixelSpacing 是否为数组且包含两个数字
    if (!Array.isArray(dicomData.pixelSpacing) || dicomData.pixelSpacing.length !== 2) {
      throw new Error("像素间距(pixelSpacing)无效，请检查数据。");
    }

    // 验证 sliceThickness 是否为数字
    if (!Array.isArray(dicomData.sliceThickness) || dicomData.pixelSpacing.length == 0) {
      throw new Error("切片厚度(SliceThickness)无效，请检查数据。");
    }

    // 验证 windowCenter 和 windowWidth 是否为数组，并且数组中的每个元素都是数字
    if (
      !Array.isArray(dicomData.windowCenter) ||
      !dicomData.windowCenter.every((item) => typeof item === "number")
    ) {
      throw new Error("窗位(WindowCenter)数组无效，请检查数据。");
    }

    if (
      !Array.isArray(dicomData.windowWidth) ||
      !dicomData.windowWidth.every((item) => typeof item === "number")
    ) {
      throw new Error("窗宽(WindowWidth)数组无效，请检查数据。");
    }

    // 验证 HitBit 数据（property0）是否存在
    if (!dicomData.hitbit || !dicomData.hitbit.property0) {
      throw new Error("HitBit 数据无效，请检查数据。");
    }

    // 所有验证通过，返回 true
    return true;
  }
  GetTagsData(arrayBuffer) {
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
    const hit_bit = this.GetHitBitData(arrayBuffer);

    return {
      pixelSpacing: pixel_spacing,
      SliceThickness: slice_thickness,
      WindowCenter: window_center,
      WindowWidth: window_width,
      HitBit: hit_bit,
    };
  }
  GetHitBitData(arrayBuffer) {
    let Hit = [];

    arrayBuffer.forEach((buffer, index) => {
      let Hitbit = {};

      const dicomdata = parseDicomData(buffer);
      // var hitbit = dicomdata.getInterpretedData(false, true);
      // let data_b = new Uint16Array(hitbit.data.length)
      // for(var pix_num = 0;pix_num<hitbit.data.length;pix_num--){
      //   data_b[pix_num] = hitbit.data[pix_num]-hitbit.min
      // }
     // hitbit.data = data_b
      // 获取 DICOM 文件中的像素间距 (Pixel Spacing)
      var hitbit = this.h_b_obj_return_h_img(dicomdata)
      const pixel_spacing = dicomdata.tags["00280030"].value;

      // 获取 DICOM 文件中的切片厚度 (Slice Thickness)
      const slice_thickness = dicomdata.tags["00180050"].value;

      // 获取窗宽 (Window Width) 和窗位 (Window Center) 信息
      const window_center = dicomdata.tags["00281050"].value;
      const window_width = dicomdata.tags["00281051"].value;
      Hitbit[`h_img`] = hitbit;
      Hitbit[`pixSpacing`] = pixel_spacing[0];
      Hitbit[`slice_Thickness`] = slice_thickness[0];
      Hitbit[`window_l`] = window_center[0]-hitbit.dx;
      Hitbit[`window_w`] = window_width[0]
      Hit.push(Hitbit);
    });

    return Hit;
  }
  
h_b_obj_return_h_img(h_b_obj) {
    

    var h_img = h_b_obj.getInterpretedData(false, true);

    // h_img.pixtype = h_b_obj.getPhotometricInterpretation();
    // h_img.imageData_max = Math.pow(2, h_b_obj.getBitsStored());
   // h_img.pixtype = ("00280004" in tags) ? tags["00280004"].value[0] : "MONOCHROME2";
    h_img.Is_fanzhuan = false;
    h_img.dx = 0;
    if (h_img.min < 0) {

        let data_b = new Uint16Array(h_img.data.length);
      // let data_b = new  Uint8Array(h_img.data.length);
      //let data_b = new  Float32Array(h_img.data.length);
        for (var pix_num = 0; pix_num < h_img.data.length; pix_num++) {
            data_b[pix_num] = h_img.data[pix_num] - h_img.min;
        }
        h_img.data = data_b;
        h_img.dx = h_img.min;
        h_img.max = h_img.max - h_img.dx;
        h_img.min = h_img.min - h_img.dx;
    }
    if (h_img.pixtype == "MONOCHROME1") {
        h_img.Is_fanzhuan = true;
    }
    return h_img;
} 
  GetHitBitData1(arrayBuffer) {
    let Hit = [];

    arrayBuffer.forEach((buffer, index) => {
      let Hitbit = {};

      const dicomdata = parseDicomData(buffer);
      const hitbit = dicomdata.getInterpretedData(false, true);
      // 获取 DICOM 文件中的像素间距 (Pixel Spacing)
      const pixel_spacing = dicomdata.tags["00280030"].value;

      // 获取 DICOM 文件中的切片厚度 (Slice Thickness)
      const slice_thickness = dicomdata.tags["00180050"].value;

      // 获取窗宽 (Window Width) 和窗位 (Window Center) 信息
      const window_center = dicomdata.tags["00281050"].value;
      const window_width = dicomdata.tags["00281051"].value;
      Hitbit[`h_img`] = hitbit;
      Hitbit[`pixSpacing`] = pixel_spacing[0];
      Hitbit[`slice_Thickness`] = slice_thickness[0];
      Hitbit[`window_l`] = window_center[0];
      Hitbit[`window_w`] = window_width[0];
      Hit.push(Hitbit);
    });

    return Hit;
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
  // arrayBuffer.forEach((buffer, index) => {
  //     const dicomdata = parseDicomData(buffer); // 解析当前切片数据
  //     const hitbit = dicomdata.getInterpretedData(false, true); // 获取当前切片的像素数据
  //     const sliceOffset = dimensions[0] * dimensions[1] * index; // 计算切片在总体数据中的偏移量
  //     typedPixelArray.set(hitbit.data, sliceOffset); // 将当前切片数据填充到对应位置
  // });
  let totalStartTime = performance.now(); // 记录循环开始的时间

  // 初始化每个步骤的总时间
  let totalParseTime = 0;
  let totalGetInterpretedTime = 0;
  let totalCalculateOffsetTime = 0;
  let totalSetPixelDataTime = 0;

  arrayBuffer.forEach((buffer, index) => {
    let start, end;
    console.log(`----------------创建数据----------------------------`);
    // 1. 记录 parseDicomData 的执行时间
    start = performance.now();
    const dicomdata = parseDicomData(buffer);
    end = performance.now();
    const parseTime = end - start;
    totalParseTime += parseTime;
    console.log(`parseDicomData-${index}: ${parseTime.toFixed(2)} ms`);

    // 2. 记录 getInterpretedData 的执行时间
    start = performance.now();
    const hitbit = dicomdata.getInterpretedData(false, true);
    end = performance.now();
    const getInterpretedTime = end - start;
    totalGetInterpretedTime += getInterpretedTime;
    console.log(`getInterpretedData-${index}: ${getInterpretedTime.toFixed(2)} ms`);

    // 3. 计算当前切片数据的偏移量
    start = performance.now();
    const sliceOffset = dimensions[0] * dimensions[1] * index;
    end = performance.now();
    const calculateOffsetTime = end - start;
    totalCalculateOffsetTime += calculateOffsetTime;
    console.log(`calculateOffset-${index}: ${calculateOffsetTime.toFixed(2)} ms`);

    // 4. 将当前切片的像素数据填充到 typedPixelArray 中
    start = performance.now();
    typedPixelArray.set(hitbit.data, sliceOffset);
    end = performance.now();
    const setPixelDataTime = end - start;
    totalSetPixelDataTime += setPixelDataTime;
    console.log(`setPixelData-${index}: ${setPixelDataTime.toFixed(2)} ms`);
  });

  let totalEndTime = performance.now(); // 记录循环结束的时间
  let totalExecutionTime = totalEndTime - totalStartTime; // 总执行时间

  // 打印每个步骤的总时间
  console.log(`Total parseDicomData time: ${totalParseTime.toFixed(2)} ms`);
  console.log(`Total getInterpretedData time: ${totalGetInterpretedTime.toFixed(2)} ms`);
  console.log(`Total calculateOffset time: ${totalCalculateOffsetTime.toFixed(2)} ms`);
  console.log(`Total setPixelData time: ${totalSetPixelDataTime.toFixed(2)} ms`);

  // 计算并打印每个步骤的平均执行时间
  let averageParseTime = totalParseTime / arrayBuffer.length;
  let averageGetInterpretedTime = totalGetInterpretedTime / arrayBuffer.length;
  let averageCalculateOffsetTime = totalCalculateOffsetTime / arrayBuffer.length;
  let averageSetPixelDataTime = totalSetPixelDataTime / arrayBuffer.length;

  console.log(`Average parseDicomData time: ${averageParseTime.toFixed(2)} ms`);
  console.log(`Average getInterpretedData time: ${averageGetInterpretedTime.toFixed(2)} ms`);
  console.log(`Average calculateOffset time: ${averageCalculateOffsetTime.toFixed(2)} ms`);
  console.log(`Average setPixelData time: ${averageSetPixelDataTime.toFixed(2)} ms`);

  console.log(`Total execution time: ${totalExecutionTime.toFixed(2)} ms`);

  // 创建 vtkDataArray 对象，用于将像素数据与 vtkImageData 关联
  return vtkDataArray.newInstance({
    name: "Pixels", // 数据的名称
    dataType: data_type, // 数据类型（如 Int16、Uint8 等）
    numberOfComponents: 1, // 每个像素的分量数（单通道图像为 1）
    values: typedPixelArray, // 像素数据
  });
}
function parseDicomData(arrayBuffer) {
  console.log(`parseDicomData buffer`);
  const startTotal = performance.now();

  const startDataView = performance.now();
  const dataView = new DataView(arrayBuffer);
  const endDataView = performance.now();
  console.log(
    `-------------DataView creation time: ${(endDataView - startDataView).toFixed(2)} ms`
  );

  const startVerbose = performance.now();
  daikon.Parser.verbose = false;
  const endVerbose = performance.now();
  console.log(
    `------------Disable verbose logging time: ${(endVerbose - startVerbose).toFixed(2)} ms`
  );

  const startParse = performance.now();
  const dicomData = daikon.Series.parseImage(dataView);
  const endParse = performance.now();
  console.log(`------------DICOM parsing time: ${(endParse - startParse).toFixed(2)} ms`);

  const endTotal = performance.now();
  console.log(
    `------Total parseDicomData execution time: ${(endTotal - startTotal).toFixed(2)} ms`
  );

  return dicomData;
}

// 封装读取和解析 DICOM 数据的函数
function parseDicomData1(arrayBuffer) {
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
