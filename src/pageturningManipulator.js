import { m as macro } from '@kitware/vtk.js/macros2.js';
import vtkCompositeCameraManipulator from '@kitware/vtk.js/Interaction/Manipulators/CompositeCameraManipulator.js';
import vtkCompositeMouseManipulator from '@kitware/vtk.js/Interaction/Manipulators/CompositeMouseManipulator.js';
import { j as cross } from '@kitware/vtk.js/Common/Core/Math/index.js';

import vtkMath from "@kitware/vtk.js/Common/Core/Math";
import { xyzToViewType } from "@kitware/vtk.js/Widgets/Widgets3D/ResliceCursorWidget/Constants";
// ----------------------------------------------------------------------------
// WindowLevelManipulator methods
// ----------------------------------------------------------------------------


function WindowLevelManipulator(publicAPI, model) {

    // Set our className
    model.classHierarchy.push('WindowLevelManipulator');
    publicAPI.onButtonDown = (interactor, renderer, position) => {
        model.previousPosition = position;
        model.windowLevelStartPosition[1] = position.y;
    };
    publicAPI.onMouseMove = (interactor, renderer, position) => {
        if (!position) {
            return;
        }
        model.windowLevelCurrentPosition[1] = position.y;
        let dy = model.windowLevelStartPosition[1] - model.windowLevelCurrentPosition[1];
        model.windowLevelStartPosition[1] = position.y;
        let v;
        if (dy > 0) {
            v = parseFloat(model._Slider.value) + 1;
        } else {
            v = parseFloat(model._Slider.value) - 1;
        }
        model._Slider.value = v;
        let widget = model.widget
        let i = model.viewIndex;
        const image = widget.getWidgetState().getImage();
        if (image) {
            clearTimeout(model.timer);
            // 卡顿的问题加了一个延迟
            model.timer = setTimeout(() => {
                // 获取滑块的新值（用户拖动后的数值）
                const newDistanceToP1 = model._Slider.value;
                // 获取当前平面的法向量（用于表示平面的方向）
                const dirProj = widget.getWidgetState().getPlanes()[xyzToViewType[i]].normal;
                // // 获取当前平面的边界点（通常是平面的两个端点）
                const planeExtremities = widget.getPlaneExtremities(xyzToViewType[i]);
                // 计算新的平面中心点：
                // 从平面起始点 planeExtremities[0] 出发，
                // 沿法向量 dirProj 移动 newDistanceToP1 的距离
                const newCenter = vtkMath.multiplyAccumulate(
                    planeExtremities[0], // 起始点
                    dirProj, // 法向量
                    Number(newDistanceToP1), // 滑块值转换为数字
                    [] // 结果存储在一个新数组中
                );
                // 设置平面的新中心点
                widget.setCenter(newCenter);

                // 模拟用户交互，触发小部件的交互事件，确保状态更新
                model.widgetInstance.invokeInteractionEvent(model.widgetInstance.getActiveInteraction());

                // 遍历所有视图属性，逐一渲染每个视图以更新显示
                model.viewAttributes.forEach((obj2) => {
                    obj2.interactor.render(); // 重新渲染视图
                });
            }, 5);
        };
    }
    publicAPI.setSlider = (slider, widget, viewAttributes, widgetInstance, viewIndex) => {
        model._Slider = slider;
        model.widget = widget;
        model.viewAttributes = viewAttributes;
        model.widgetInstance = widgetInstance;
        model.viewIndex = viewIndex;
    };
}
// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------


// ----------------------------------------------------------------------------

function extend(publicAPI, model) {
    let initialValues = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    Object.assign(model, DEFAULT_VALUES, initialValues);

    // Inheritance
    macro.obj(publicAPI, model);
    macro.get(publicAPI, model, ['currentImageProperty']);
    vtkCompositeCameraManipulator.extend(publicAPI, model, initialValues);
    vtkCompositeMouseManipulator.extend(publicAPI, model, initialValues);

    // Object specific methods
    WindowLevelManipulator(publicAPI, model);
}

// ----------------------------------------------------------------------------

const newInstance = macro.newInstance(extend, 'WindowLevelManipulator');

const DEFAULT_VALUES = {
    windowLevelStartPosition: [0, 0],
    windowLevelCurrentPosition: [0, 0],
    lastSlicePosition: 0,
    _interactor: null,
    _Slider: null,
    currentImageProperty: null,
    currentImageNumber: -1,
}
// ----------------------------------------------------------------------------

var WindowLevelManipulator$1 = {
    newInstance,
    extend,
};

export { WindowLevelManipulator$1 as default, extend, newInstance };

