
import "@kitware/vtk.js/Rendering/Profiles/All";
import vtkVolume from "@kitware/vtk.js/Rendering/Core/Volume";
import vtkVolumeMapper from "@kitware/vtk.js/Rendering/Core/VolumeMapper";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkBoundingBox from "@kitware/vtk.js/Common/DataModel/BoundingBox";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkPiecewiseFunction from "@kitware/vtk.js/Common/DataModel/PiecewiseFunction";
import vtkVolumeProperty from "@kitware/vtk.js/Rendering/Core/VolumeProperty";
import colorPresets from './MedicalColorPresets.json';

var renderWindow_3d = null;
var  volume_3d = null;
export function Demo3d(source, divElement) {
    const renderMainBox = divElement;
    renderMainBox.style.position = "relative";

    // 添加一个下拉list的选择元素到divElement
    const select = document.createElement("select");
    select.id = "color-preset-select";
    const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        container: renderMainBox,
        background: [0, 0, 0],
    });
    const renderer = fullScreenRenderer.getRenderer();
    renderWindow_3d = fullScreenRenderer.getRenderWindow();
    volume_3d = vtkVolume.newInstance();
    const mapper = vtkVolumeMapper.newInstance();

    mapper.setInputData(source);
    volume_3d.setMapper(mapper);

    const sampleDistance =
        0.7 *
        Math.sqrt(
            source
                .getSpacing()
                .map((v) => v * v)
                .reduce((a, b) => a + b, 0)
        );
    mapper.setSampleDistance(sampleDistance);
    mapper.setComputeNormalFromOpacity(false);
    mapper.setGlobalIlluminationReach(0.0);
    mapper.setVolumetricScatteringBlending(0.5);
    mapper.setVolumeShadowSamplingDistFactor(5.0);

    const volProp = vtkVolumeProperty.newInstance();
    volProp.setInterpolationTypeToLinear();
    volume_3d
        .getProperty()
        .setScalarOpacityUnitDistance(
            0,
            vtkBoundingBox.getDiagonalLength(source.getBounds()) /
            Math.max(...source.getDimensions())
        );
    volProp.setGradientOpacityMinimumValue(0, 0);
    const dataArray =
        source.getPointData().getScalars() ||
        source.getPointData().getArrays()[0];
    const dataRange = dataArray.getRange();
    console.log(dataRange);
    volume_3d
        .getProperty()
        .setGradientOpacityMaximumValue(
            0,
            (dataRange[1] - dataRange[0]) * 0.05
        );
    volProp.setShade(true);
    volProp.setUseGradientOpacity(0, false);
    volProp.setGradientOpacityMinimumOpacity(0, 0.0);
    volProp.setGradientOpacityMaximumOpacity(0, 1.0);
    // volProp.setAmbient(0.0);
    volProp.setDiffuse(2.0);
    volProp.setSpecular(0.0);
    volProp.setSpecularPower(0.0);
    volProp.setUseLabelOutline(false);
    // volProp.setLabelOutlineThickness(2);
    volume_3d.setProperty(volProp);

    const cam = renderer.getActiveCamera();
    cam.setPosition(0, 0, 0);
    cam.setFocalPoint(-1, -1, 0);
    cam.setViewUp(0, 0, -1);

    renderer.addVolume(volume_3d);
    // const pf = vtkPiecewiseFunction.newInstance();
    // pf.addPoint(0, 0.0);
    // pf.addPoint(100, 0.0);
    // pf.addPoint(3120, 1.0);
    // volume.getProperty().setScalarOpacity(0, pf);
    // const ctf = vtkColorTransferFunction.newInstance();
    // ctf.addRGBPoint(200.0, 1.0, 1.0, 1.0);
    // ctf.addRGBPoint(2000.0, 1.0, 1.0, 1.0);

    // volume.getProperty().setRGBTransferFunction(0, ctf);
    load3dColor('CT-AAA2');

    renderer.resetCamera();
    renderer.resetCameraClippingRange();
    renderWindow_3d.render();
}


// 颜色切换函数
export function load3dColor(presetName) {
    const preset = colorPresets.find(p => p.Name === presetName);
    const pf = vtkPiecewiseFunction.newInstance();
    // pf.addPoint(0, 0.0);
    // pf.addPoint(100, 0.0);
    // pf.addPoint(3120, 1.0);
    // volume.getProperty().setScalarOpacity(0, pf);
    const ctf = vtkColorTransferFunction.newInstance();
    // 重置传输函数
    ctf.removeAllPoints();
    pf.removeAllPoints();

    // 设置颜色点
    // 设置颜色点（每4个一组：值, R, G, B）
    for (let i = 0; i < preset.RGBPoints.length; i += 4) {
        ctf.addRGBPoint(
            preset.RGBPoints[i],
            preset.RGBPoints[i + 1],
            preset.RGBPoints[i + 2],
            preset.RGBPoints[i + 3]
        );
    }

    // 设置透明度点（每两个一组：值, 透明度）
    for (let i = 0; i < preset.OpacityPoints.length; i += 2) {
        pf.addPoint(
            preset.OpacityPoints[i],
            preset.OpacityPoints[i + 1]
        );
    }
    pf.setRange(...preset.EffectiveRange);
    // 更新体积属性
    volume_3d.getProperty().setRGBTransferFunction(0, ctf);
    volume_3d.getProperty().setScalarOpacity(0, pf);

    // 触发重新渲染
    renderWindow_3d.render();
};