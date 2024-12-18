import daikon from "./halo_200804";
import validateInputs from "./data/validate"
// import createImageData from "./data/createImage"
export async function loadMPR(dicomInfo, controlId) {
    // console.log("data",dicomInfo, sliderIds, containerIds);
  // 调用验证函数
  let data = await  validateInputs(dicomInfo, controlId);
//   // 加载 DICOM 数据
//   const loadInfo = loadDICOM();
  console.log("data", data);
//   console.log("loadInfo", loadInfo);
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
