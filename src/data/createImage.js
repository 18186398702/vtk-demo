import "@kitware/vtk.js/favicon";

import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";

export default function createImageData(dicomSlices) {
  const imageData = vtkImageData.newInstance();
  const dimensions = [
    dicomSlices[0].pixelData.Description.numCols,
    dicomSlices[0].pixelData.Description.numRows,
    dicomSlices.length,
  ];
  imageData.setDimensions(...dimensions);

  // 设置图像数据的维度和体素间距
  let pixelSpacing = dicomSlices[0].pixelSpacing.Description;
  let sliceThickness = dicomSlices[0].sliceThickness.Description;
  let spacing = [pixelSpacing[0], pixelSpacing[1], sliceThickness[0]];
  imageData.setSpacing(spacing);
  imageData.setOrigin([0, 0, 0]);
  const typedPixelArray = new Float32Array(dimensions[0] * dimensions[1] * dimensions[2]);
  dicomSlices.forEach((slice, index) => {
    const slicePixelData = slice.pixelData.Description.data;
    const sliceOffset = dimensions[0] * dimensions[1] * index;
    typedPixelArray.set(slicePixelData, sliceOffset);
  });
  const scalarArray = vtkDataArray.newInstance({
    name: "Pixels",
    dataType: "Float32Array",
    numberOfComponents: 1,
    values: typedPixelArray,
  });
  imageData.getPointData().setScalars(scalarArray);
  return imageData;
}
