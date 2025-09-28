import "@kitware/vtk.js/Rendering/Profiles/All";
import vtkVolume from "@kitware/vtk.js/Rendering/Core/Volume";
import vtkVolumeMapper from "@kitware/vtk.js/Rendering/Core/VolumeMapper";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkBoundingBox from "@kitware/vtk.js/Common/DataModel/BoundingBox";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkPiecewiseFunction from "@kitware/vtk.js/Common/DataModel/PiecewiseFunction";
import vtkVolumeProperty from "@kitware/vtk.js/Rendering/Core/VolumeProperty";
import vtkLight from 'vtk.js/Sources/Rendering/Core/Light';

let volumeRenderWindow = null;
let volumeRenderer = null;

/**
 * 創建體積渲染示例
 * @param {Object} imageData - VTK ImageData對象
 * @param {HTMLElement} container - 渲染容器
 */
export function createVolumeRenderingExample(imageData, container) {
    console.log('開始創建體積渲染示例...');

    // 清空容器
    container.innerHTML = '';
    container.style.position = 'relative';

    try {
        // 創建全屏渲染窗口
        const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
            container: container,
            background: [0.1, 0.1, 0.2], // 深藍色背景
        });

        volumeRenderer = fullScreenRenderer.getRenderer();
        volumeRenderWindow = fullScreenRenderer.getRenderWindow();

        // 創建體積對象
        const volume = vtkVolume.newInstance();
        const mapper = vtkVolumeMapper.newInstance();

        // 設置輸入數據
        mapper.setInputData(imageData);
        volume.setMapper(mapper);

        // 計算合適的採樣距離
        const spacing = imageData.getSpacing();
        const sampleDistance = 0.7 * Math.sqrt(
            spacing.map((v) => v * v).reduce((a, b) => a + b, 0)
        );

        // 配置mapper參數
        mapper.setSampleDistance(sampleDistance);
        mapper.setComputeNormalFromOpacity(true);
        mapper.setGlobalIlluminationReach(0.1);
        mapper.setVolumetricScatteringBlending(0.3);
        mapper.setVolumeShadowSamplingDistFactor(3.0);

        // 創建體積屬性
        const volumeProperty = vtkVolumeProperty.newInstance();
        volumeProperty.setShade(true);
        volumeProperty.setUseGradientOpacity(0, true);
        volumeProperty.setGradientOpacityMinimumOpacity(0, 0.0);
        volumeProperty.setGradientOpacityMaximumOpacity(0, 1.0);
        volumeProperty.setAmbient(0.3);
        volumeProperty.setDiffuse(0.7);
        volumeProperty.setSpecular(0.2);
        volumeProperty.setSpecularPower(20.0);

        // 設置不透明度單位距離
        const bounds = imageData.getBounds();
        const dimensions = imageData.getDimensions();
        volumeProperty.setScalarOpacityUnitDistance(
            0,
            vtkBoundingBox.getDiagonalLength(bounds) / Math.max(...dimensions)
        );

        // 獲取數據範圍
        const dataArray = imageData.getPointData().getScalars();
        const dataRange = dataArray.getRange();
        console.log('數據範圍:', dataRange);

        // 設置梯度不透明度
        volumeProperty.setGradientOpacityMaximumValue(
            0,
            (dataRange[1] - dataRange[0]) * 0.05
        );

        // 創建顏色傳輸函數
        const colorTransferFunction = vtkColorTransferFunction.newInstance();
        colorTransferFunction.removeAllPoints();

        // 設置適合醫學影像的顏色映射
        const minValue = dataRange[0];
        const maxValue = dataRange[1];
        const range = maxValue - minValue;

        // 骨骼/組織顏色映射
        colorTransferFunction.addRGBPoint(minValue, 0.0, 0.0, 0.0);                    // 黑色 - 空氣
        colorTransferFunction.addRGBPoint(minValue + range * 0.1, 0.2, 0.1, 0.1);     // 深紅 - 軟組織
        colorTransferFunction.addRGBPoint(minValue + range * 0.3, 0.8, 0.6, 0.4);     // 膚色 - 肌肉
        colorTransferFunction.addRGBPoint(minValue + range * 0.6, 1.0, 0.9, 0.8);     // 淺色 - 骨骼
        colorTransferFunction.addRGBPoint(maxValue, 1.0, 1.0, 1.0);                   // 白色 - 高密度骨骼

        // 創建不透明度傳輸函數
        const opacityFunction = vtkPiecewiseFunction.newInstance();
        opacityFunction.removeAllPoints();

        // 設置不透明度映射 - 讓空氣透明，骨骼不透明
        opacityFunction.addPoint(minValue, 0.0);                    // 完全透明
        opacityFunction.addPoint(minValue + range * 0.1, 0.0);     // 仍然透明
        opacityFunction.addPoint(minValue + range * 0.2, 0.1);     // 開始顯現
        opacityFunction.addPoint(minValue + range * 0.4, 0.3);     // 軟組織
        opacityFunction.addPoint(minValue + range * 0.7, 0.8);     // 骨骼
        opacityFunction.addPoint(maxValue, 1.0);                   // 完全不透明

        // 應用傳輸函數
        volumeProperty.setRGBTransferFunction(0, colorTransferFunction);
        volumeProperty.setScalarOpacity(0, opacityFunction);

        // 設置體積屬性
        volume.setProperty(volumeProperty);

        // 設置相機
        const camera = volumeRenderer.getActiveCamera();
        camera.setPosition(0, 0, 1);
        camera.setFocalPoint(0, 0, 0);
        camera.setViewUp(0, 1, 0);

        // 添加光源
        const light = vtkLight.newInstance();
        light.setIntensity(1.0);
        // 設置光源位置和方向
        light.setPosition(1, 1, 1);
        light.setFocalPoint(0, 0, 0);
        volumeRenderer.removeAllLights();
        volumeRenderer.addLight(light);

        // 添加體積到渲染器
        volumeRenderer.addVolume(volume);

        // 重置相機以適合數據
        volumeRenderer.resetCamera();
        volumeRenderer.resetCameraClippingRange();

        // 創建控制面板
        createVolumeControls(container, volumeProperty, colorTransferFunction, opacityFunction, dataRange);

        // 渲染
        volumeRenderWindow.render();

        console.log('體積渲染創建完成');

        return {
            renderWindow: volumeRenderWindow,
            renderer: volumeRenderer,
            volume: volume,
            volumeProperty: volumeProperty
        };

    } catch (error) {
        console.error('體積渲染創建失敗:', error);

        // 顯示錯誤信息
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            padding: 20px;
            background: #ffebee;
            border: 1px solid #f44336;
            border-radius: 4px;
            color: #c62828;
            text-align: center;
            font-family: Arial, sans-serif;
        `;
        errorDiv.innerHTML = `
            <h3>體積渲染失敗</h3>
            <p>錯誤: ${error.message}</p>
            <p>請檢查WebGL支持或數據格式</p>
        `;
        container.appendChild(errorDiv);

        throw error;
    }
}

/**
 * 創建體積渲染控制面板
 */
function createVolumeControls(container, volumeProperty, colorTransferFunction, opacityFunction, dataRange) {
    const controlPanel = document.createElement('div');
    controlPanel.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        min-width: 200px;
    `;

    controlPanel.innerHTML = `
        <h4 style="margin: 0 0 10px 0; color: #4CAF50;">體積渲染控制</h4>

        <div style="margin-bottom: 10px;">
            <label>環境光強度:</label><br>
            <input type="range" id="ambientSlider" min="0" max="1" step="0.1" value="0.3" style="width: 100%;">
            <span id="ambientValue">0.3</span>
        </div>

        <div style="margin-bottom: 10px;">
            <label>漫反射強度:</label><br>
            <input type="range" id="diffuseSlider" min="0" max="1" step="0.1" value="0.7" style="width: 100%;">
            <span id="diffuseValue">0.7</span>
        </div>

        <div style="margin-bottom: 10px;">
            <label>高光強度:</label><br>
            <input type="range" id="specularSlider" min="0" max="1" step="0.1" value="0.2" style="width: 100%;">
            <span id="specularValue">0.2</span>
        </div>

        <div style="margin-bottom: 10px;">
            <label>整體透明度:</label><br>
            <input type="range" id="opacitySlider" min="0" max="2" step="0.1" value="1" style="width: 100%;">
            <span id="opacityValue">1.0</span>
        </div>

        <div style="margin-bottom: 10px;">
            <button id="resetCamera" style="width: 100%; padding: 5px; background: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer;">
                重置視角
            </button>
        </div>

        <div>
            <button id="toggleShading" style="width: 100%; padding: 5px; background: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer;">
                切換陰影
            </button>
        </div>
    `;

    container.appendChild(controlPanel);

    // 綁定事件
    const ambientSlider = controlPanel.querySelector('#ambientSlider');
    const ambientValue = controlPanel.querySelector('#ambientValue');
    const diffuseSlider = controlPanel.querySelector('#diffuseSlider');
    const diffuseValue = controlPanel.querySelector('#diffuseValue');
    const specularSlider = controlPanel.querySelector('#specularSlider');
    const specularValue = controlPanel.querySelector('#specularValue');
    const opacitySlider = controlPanel.querySelector('#opacitySlider');
    const opacityValue = controlPanel.querySelector('#opacityValue');
    const resetCameraBtn = controlPanel.querySelector('#resetCamera');
    const toggleShadingBtn = controlPanel.querySelector('#toggleShading');

    ambientSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        volumeProperty.setAmbient(value);
        ambientValue.textContent = value.toFixed(1);
        volumeRenderWindow.render();
    });

    diffuseSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        volumeProperty.setDiffuse(value);
        diffuseValue.textContent = value.toFixed(1);
        volumeRenderWindow.render();
    });

    specularSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        volumeProperty.setSpecular(value);
        specularValue.textContent = value.toFixed(1);
        volumeRenderWindow.render();
    });

    opacitySlider.addEventListener('input', (e) => {
        const multiplier = parseFloat(e.target.value);

        // 重新設置不透明度函數
        opacityFunction.removeAllPoints();
        const minValue = dataRange[0];
        const maxValue = dataRange[1];
        const range = maxValue - minValue;

        opacityFunction.addPoint(minValue, 0.0);
        opacityFunction.addPoint(minValue + range * 0.1, 0.0 * multiplier);
        opacityFunction.addPoint(minValue + range * 0.2, 0.1 * multiplier);
        opacityFunction.addPoint(minValue + range * 0.4, 0.3 * multiplier);
        opacityFunction.addPoint(minValue + range * 0.7, 0.8 * multiplier);
        opacityFunction.addPoint(maxValue, 1.0 * multiplier);

        opacityValue.textContent = multiplier.toFixed(1);
        volumeRenderWindow.render();
    });

    resetCameraBtn.addEventListener('click', () => {
        volumeRenderer.resetCamera();
        volumeRenderer.resetCameraClippingRange();
        volumeRenderWindow.render();
    });

    let shadingEnabled = true;
    toggleShadingBtn.addEventListener('click', () => {
        shadingEnabled = !shadingEnabled;
        volumeProperty.setShade(shadingEnabled);
        toggleShadingBtn.textContent = shadingEnabled ? '切換陰影' : '啟用陰影';
        volumeRenderWindow.render();
    });
}