import "@kitware/vtk.js/Rendering/Profiles/All";
import vtkVolume from "@kitware/vtk.js/Rendering/Core/Volume";
import vtkVolumeMapper from "@kitware/vtk.js/Rendering/Core/VolumeMapper";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkBoundingBox from "@kitware/vtk.js/Common/DataModel/BoundingBox";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkPiecewiseFunction from "@kitware/vtk.js/Common/DataModel/PiecewiseFunction";
import vtkVolumeProperty from "@kitware/vtk.js/Rendering/Core/VolumeProperty";
import vtkPiecewiseGaussianWidget from "@kitware/vtk.js/Interaction/Widgets/PiecewiseGaussianWidget";
import vtkWidgetManager from "@kitware/vtk.js/Widgets/Core/WidgetManager";
import vtkLight from 'vtk.js/Sources/Rendering/Core/Light';
import vtkColorMaps from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps';
import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
import vtkHttpDataAccessHelper from '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import DataAccessHelper from '@kitware/vtk.js/IO/Core/DataAccessHelper';
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";



let renderWindow = null;
let gaussianRenderer = null;
let gaussianVolume = null;
let widget = null;
let widgetManager = null;
let labelContainer = null;
/**
 * 創建基於PiecewiseGaussianWidget的體積渲染示例
 * @param {Object} imageData - VTK ImageData對象
 * @param {HTMLElement} container - 渲染容器
 */
export function createPiecewiseGaussianVolumeExample(localImageData, container) {
    // 清空容器
    container.innerHTML = '';
    container.style.position = 'relative';
    console.log('開始創建PiecewiseGaussian體積渲染示例...', localImageData);
    const widgetContainer = document.createElement('div');
    widgetContainer.style.position = 'absolute';
    widgetContainer.style.top = 'calc(10px + 1em)';
    widgetContainer.style.left = '5px';
    widgetContainer.style.background = 'rgba(255, 255, 255, 0.3)';
    container.appendChild(widgetContainer);

    labelContainer = document.createElement('div');
    labelContainer.style.position = 'absolute';
    labelContainer.style.top = '5px';
    labelContainer.style.left = '5px';
    labelContainer.style.width = '100%';
    labelContainer.style.color = 'white';
    labelContainer.style.textAlign = 'center';
    labelContainer.style.userSelect = 'none';
    labelContainer.style.cursor = 'pointer';
    container.appendChild(labelContainer);

    // 函数：分析和打印imageData属性
    function analyzeImageData(data, name) {
        console.log(`=== ${name} ImageData 属性分析 ===`);
        console.log('维度 (Dimensions):', data.getDimensions());
        console.log('间距 (Spacing):', data.getSpacing());
        console.log('原点 (Origin):', data.getOrigin());
        console.log('边界 (Bounds):', data.getBounds());
        console.log('扩展 (Extent):', data.getExtent());
        const scalars = data.getPointData().getScalars();
        if (scalars) {
            console.log('标量数据类型:', scalars.getDataType());
            console.log('标量数据范围:', scalars.getRange());
            // console.log('标量数据大小:', scalars.getSize());
            console.log('标量数据组件数:', scalars.getNumberOfComponents());
        }
        console.log('=====================================');
        return data;
    }

    const reader = vtkHttpDataSetReader.newInstance({ fetchGzip: true });

    reader.setUrl(`https://kitware.github.io/vtk-js/data/volume/LIDC2.vti`).then(() => {
        reader.loadData().then(() => {
            const remoteImageData = reader.getOutputData();
            console.log('遠程數據加載完成！');

            // 分析远程数据属性
            analyzeImageData(remoteImageData, '遠程VTI文件');

            // 分析本地数据属性
            if (localImageData) {
                analyzeImageData(localImageData, '本地DICOM文件');

                // 对比关键属性差异
                console.log('=== 属性差异对比 ===');
                const remoteDims = remoteImageData.getDimensions();
                const localDims = localImageData.getDimensions();
                console.log('维度差异:', {
                    remote: remoteDims,
                    local: localDims,
                    different: !remoteDims.every((v, i) => v === localDims[i])
                });

                const remoteSpacing = remoteImageData.getSpacing();
                const localSpacing = localImageData.getSpacing();
                console.log('间距差异:', {
                    remote: remoteSpacing,
                    local: localSpacing,
                    different: !remoteSpacing.every((v, i) => Math.abs(v - localSpacing[i]) > 0.001)
                });

                const remoteOrigin = remoteImageData.getOrigin();
                const localOrigin = localImageData.getOrigin();
                console.log('原点差异:', {
                    remote: remoteOrigin,
                    local: localOrigin,
                    different: !remoteOrigin.every((v, i) => Math.abs(v - localOrigin[i]) > 0.001)
                });

                const remoteRange = remoteImageData.getPointData().getScalars().getRange();
                const localRange = localImageData.getPointData().getScalars().getRange();
                console.log('数据范围差异:', {
                    remote: remoteRange,
                    local: localRange,
                    different: Math.abs(remoteRange[0] - localRange[0]) > 0.001 || Math.abs(remoteRange[1] - localRange[1]) > 0.001
                });
                console.log('==================');
            }

            // 函数：标准化本地数据使其与远程数据属性一致
            function standardizeLocalData(localData, referenceData) {
                if (!localData || !referenceData) return localData;

                console.log('開始標準化本地數據...');

                const refRange = localData.getPointData().getScalars().getRange();

                // 克隆本地数据以避免修改原始数据
                const standardizedData = vtkImageData.newInstance();
                standardizedData.setDimensions(...localData.getDimensions());

                // 获取本地数据的标量
                const localScalars = localData.getPointData().getScalars();
                const localRange = localScalars.getRange();

                // 标准化数据范围到参考数据范围
                const localData_ = localScalars.getData();
                const normalizedData = new Float32Array(localData_.length);

                for (let i = 0; i < localData_.length; i++) {
                    // 将本地数据范围映射到参考数据范围
                    const normalizedValue = (localData_[i] - localRange[0]) / (localRange[1] - localRange[0]) * (refRange[1] - refRange[0]) + refRange[0];
                    normalizedData[i] = normalizedValue;
                }

                // 创建新的标量数组
                const standardizedScalars = vtkDataArray.newInstance({
                    name: 'Pixels',
                    dataType: 'Float32Array',
                    numberOfComponents: 1,
                    values: normalizedData
                });
                localData.getPointData().setScalars(standardizedScalars);
                console.log('本地數據標準化完成');
                analyzeImageData(standardizedData, '標準化後的本地數據');
                return localData
                return standardizedData;
            }

            // 决定使用哪个数据进行渲染
            let imageData = remoteImageData;
            let useStandardizedLocal = true; // 可以通过这个标志切换

            if (localImageData && useStandardizedLocal) {
                imageData = standardizeLocalData(localImageData, remoteImageData);
                console.log('使用標準化後的本地數據進行渲染');
            } else {
                console.log('使用遠程數據進行渲染');
            }

            // 創建全屏渲染窗口
            const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
                container: container,
                background: [0.1, 0.1, 0.2],
            });

            gaussianRenderer = fullScreenRenderer.getRenderer();
            renderWindow = fullScreenRenderer.getRenderWindow();
            renderWindow.getInteractor().setDesiredUpdateRate(15.0);
            widget = vtkPiecewiseGaussianWidget.newInstance({
                numberOfBins: 256,
                size: [400, 150],
            });
            widget.updateStyle({
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                histogramColor: 'rgba(100, 100, 100, 0.5)',
                strokeColor: 'rgb(0, 0, 0)',
                activeColor: 'rgb(255, 255, 255)',
                handleColor: 'rgb(50, 150, 50)',
                buttonDisableFillColor: 'rgba(255, 255, 255, 0.5)',
                buttonDisableStrokeColor: 'rgba(0, 0, 0, 0.5)',
                buttonStrokeColor: 'rgba(0, 0, 0, 1)',
                buttonFillColor: 'rgba(255, 255, 255, 1)',
                strokeWidth: 2,
                activeStrokeWidth: 3,
                buttonStrokeWidth: 1.5,
                handleWidth: 3,
                iconSize: 20, // Can be 0 if you want to remove buttons (dblClick for (+) / rightClick for (-))
                padding: 10,
            });
            fullScreenRenderer.setResizeCallback(({ width, height }) => {
                widget.setSize(Math.min(450, width - 10), 150);
            });
            const piecewiseFunction = vtkPiecewiseFunction.newInstance();

            let presetIndex = 1;
            const globalDataRange = [0, 255];
            const lookupTable = vtkColorTransferFunction.newInstance();

            function changePreset(delta = 1) {
                presetIndex =
                    (presetIndex + delta + vtkColorMaps.rgbPresetNames.length) %
                    vtkColorMaps.rgbPresetNames.length;
                lookupTable.applyColorMap(
                    vtkColorMaps.getPresetByName(vtkColorMaps.rgbPresetNames[presetIndex])
                );
                lookupTable.setMappingRange(...globalDataRange);
                lookupTable.updateRange();
                labelContainer.innerHTML = vtkColorMaps.rgbPresetNames[presetIndex];
            }

            // 創建體積對象
            gaussianVolume = vtkVolume.newInstance();
            const mapper = vtkVolumeMapper.newInstance({ sampleDistance: 1.1 });
            gaussianVolume.getProperty().setRGBTransferFunction(0, lookupTable);
            gaussianVolume.getProperty().setScalarOpacity(0, piecewiseFunction);
            console.log('屬性：', lookupTable, piecewiseFunction);
            gaussianVolume.getProperty().setInterpolationTypeToLinear();
            // gaussianVolume.getProperty().setShade(true);
            // gaussianVolume.getProperty().setAmbient(0.2);
            // gaussianVolume.getProperty().setDiffuse(0.7);
            // gaussianVolume.getProperty().setSpecular(0.3);
            // gaussianVolume.getProperty().setSpecularPower(8.0);
            widget.addGaussian(0.425, 0.5, 0.2, 0.3, 0.2);
            widget.addGaussian(0.75, 1, 0.3, 0, 0);
            // 設置輸入數據
            mapper.setInputData(imageData);
            gaussianVolume.setMapper(mapper);

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





            // 添加體積到渲染器
            gaussianRenderer.addVolume(gaussianVolume);




            const dataArray = imageData.getPointData().getScalars();
            const dataRange = dataArray.getRange();
            globalDataRange[0] = dataRange[0];
            globalDataRange[1] = dataRange[1];

            // Update Lookup table
            changePreset();

            // Automatic switch to next preset every 5s
            // if (!rootContainer) {
            //     intervalID = setInterval(changePreset, 5000);
            // }

            widget.setDataArray(dataArray.getData());
            widget.applyOpacity(piecewiseFunction);
            widget.setColorTransferFunction(lookupTable);
            lookupTable.onModified(() => {
                widget.render();
                renderWindow.render();
            });
            // 重置相機以適合數據
            gaussianRenderer.resetCamera();
            gaussianRenderer.resetCameraClippingRange();
            gaussianRenderer.getActiveCamera().elevation(70);
            renderWindow.render();

            console.log('PiecewiseGaussian體積渲染創建完成');
            widget.setContainer(widgetContainer);
            widget.bindMouseListeners();

            widget.onAnimation((start) => {
                if (start) {
                    renderWindow.getInteractor().requestAnimation(widget);
                } else {
                    renderWindow.getInteractor().cancelAnimation(widget);
                }
            });

            widget.onOpacityChange(() => {
                widget.applyOpacity(piecewiseFunction);
                if (!renderWindow.getInteractor().isAnimating()) {
                    renderWindow.render();
                }
            });
            labelContainer.addEventListener('click', (event) => {
                if (event.pageX < 200) {
                    stopInterval();
                    changePreset(-1);
                } else {
                    stopInterval();
                    changePreset(1);
                }
            });
        });
    });
    return {
        renderWindow: renderWindow,
        renderer: gaussianRenderer,
        volume: gaussianVolume,
        widget: widget,
        widgetManager: widgetManager
    };


}



