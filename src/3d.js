
import "@kitware/vtk.js/Rendering/Profiles/All";
import vtkVolume from "@kitware/vtk.js/Rendering/Core/Volume";
import vtkVolumeMapper from "@kitware/vtk.js/Rendering/Core/VolumeMapper";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkBoundingBox from "@kitware/vtk.js/Common/DataModel/BoundingBox";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkPiecewiseFunction from "@kitware/vtk.js/Common/DataModel/PiecewiseFunction";
import vtkVolumeProperty from "@kitware/vtk.js/Rendering/Core/VolumeProperty";
import colorPresets from './MedicalColorPresets.json';
import vtkLight from 'vtk.js/Sources/Rendering/Core/Light';

var renderWindow_3d = null;
var volume_3d = null;
var sr = null
var renderer_3d = null;
// 导出renderWindow_3d
export function export3dImg() {
    renderWindow_3d.render();
    // 将渲染窗口的内容导出成图片
    const canvas = sr.getContainer().querySelector('canvas');;
    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'webgl-export.png';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }, 'image/png');
}

export function change3DLightIntensity(value) {
    renderer_3d.getLights()[0].setIntensity(parseFloat(value) / 10)
    renderWindow_3d.render();
}

export function Demo3d(source, divElement, type) {
    const renderMainBox = divElement;
    renderMainBox.innerHTML = "";
    renderMainBox.style.position = "relative";
    if (type == '1') {
        const lightIntensity = document.createElement("input");
        lightIntensity.type = "range";
        lightIntensity.min = 0;
        lightIntensity.max = 50;
        lightIntensity.value = 10;
        lightIntensity.style.position = "absolute";
        lightIntensity.style.top = "55px";
        lightIntensity.style.right = "-55px";
        lightIntensity.style.width = "120px";
        // lightIntensity变纵向
        lightIntensity.style.transform = "rotate(270deg)";
        renderMainBox.parentElement.appendChild(lightIntensity);
        lightIntensity.onchange = function () {
            change3DLightIntensity(this.value);
        };
        const select = document.createElement("select");
        select.onchange = function () {
            load3dColor(this.value);
        };
        select.innerHTML = colorPresets.map(preset => `<option value="${preset.Name}">${preset.Name}</option>`).join('');
        renderMainBox.appendChild(select);
        select.style.position = "absolute";
        select.style.bottom = "10px";
        select.style.left = "50%";
        select.style.transform = "translate(-50%, 0%)";
    }
    // 用js的方式加到divElement里


    const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        container: renderMainBox,
        background: [0, 0, 0],
    });
    sr = fullScreenRenderer;
    renderer_3d = fullScreenRenderer.getRenderer();
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


    volume_3d
        .getProperty()
        .setScalarOpacityUnitDistance(
            0,
            vtkBoundingBox.getDiagonalLength(source.getBounds()) /
            Math.max(...source.getDimensions())
        );

    const dataArray =
        source.getPointData().getScalars() ||
        source.getPointData().getArrays()[0];
    const dataRange = dataArray.getRange();
    console.log(dataRange);
    volume_3d
        .getProperty()
        .setGradientOpacityMaximumValue(
            0,
            (dataRange[1] - dataRange[0]) * 0.01
        );
    const volProp = vtkVolumeProperty.newInstance();
    // volProp.setInterpolationTypeToLinear();
    volProp.setShade(true);
    volProp.setUseGradientOpacity(0, true);
    volProp.setGradientOpacityMinimumOpacity(0, 0.0);
    volProp.setGradientOpacityMaximumOpacity(0, 1.0);
    volProp.setAmbient(0.2);  // 环境光
    volProp.setDiffuse(0.8);  // 漫反射光
    volProp.setSpecular(0.3); // 高光
    // volProp.setSpecularPower(8.0);
    // volProp.setLabelOutlineThickness(2);

    volume_3d.setProperty(volProp);


    const cam = renderer_3d.getActiveCamera();
    cam.setPosition(0, 0, 0);
    cam.setFocalPoint(1, 1, 0);
    cam.setViewUp(0, 0, 1);
    const fixedLight = vtkLight.newInstance();
    // fixedLight.setPosition(0, 0, -1);   // 固定在世界坐标
    fixedLight.setIntensity(1.0);
    renderer_3d.removeAllLights();
    renderer_3d.addLight(fixedLight);
    renderer_3d.addVolume(volume_3d);
    // const pf = vtkPiecewiseFunction.newInstance();
    // pf.addPoint(0, 0.0);
    // pf.addPoint(100, 0.0);
    // pf.addPoint(3120, 1.0);
    // volume.getProperty().setScalarOpacity(0, pf);
    // const ctf = vtkColorTransferFunction.newInstance();
    // ctf.addRGBPoint(200.0, 1.0, 1.0, 1.0);
    // ctf.addRGBPoint(2000.0, 1.0, 1.0, 1.0);

    // volume.getProperty().setRGBTransferFunction(0, ctf);
    load3dColor('CT-AAA');

    renderer_3d.resetCamera();
    renderer_3d.resetCameraClippingRange();
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
    const gain = 1; // CTF / OTF 的灰度值 亮度 >1 变亮，<1 变暗
    for (let i = 0; i < preset.RGBPoints.length; i += 4) {
        ctf.addRGBPoint(
            preset.RGBPoints[i],
            preset.RGBPoints[i + 1] * gain,
            preset.RGBPoints[i + 2] * gain,
            preset.RGBPoints[i + 3] * gain
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