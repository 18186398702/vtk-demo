/**
 * 验证输入参数的有效性
 * @param {Promise} dicomInfo - 一个 Promise 类型的 DICOM 数据
 * @param {Array} sliderIds - 滑块 ID 数组
 * @param {Array} containerIds - 容器 ID 数组
 * @param {string} loadType - 加载类型字符串
 * @throws {Error} 如果任何验证失败，抛出错误
 */
 export default async function validateInputs(dicomInfo, sliderIds, containerIds) {
    // 验证 dicomInfo 是否是 Promise 类型
    if (!(dicomInfo instanceof Promise)) {
      throw new Error("dicomInfo 必须是 Promise 类型");
    }
  
    // 等待 dicomInfo 解析完成并验证其数据是否有效
    const data = await dicomInfo;
    if (!data || Object.keys(data).length === 0) {
      throw new Error("dicomInfo 解析的结果不能为空");
    }
  
    // 验证 sliderIds 是否为数组且非空
    if (!Array.isArray(sliderIds) || sliderIds.length === 0) {
      throw new Error("sliderIds 必须是一个非空数组");
    }
  
    // 验证 containerIds 是否为数组且非空
    if (!Array.isArray(containerIds) || containerIds.length === 0) {
      throw new Error("containerIds 必须是一个非空数组");
    }

    const sortedData = data.sort(
      (a, b) => a.instanceNumber.Description[0] - b.instanceNumber.Description[0]
    );
    return sortedData; // 返回 dicomInfo 的数据
  }
  