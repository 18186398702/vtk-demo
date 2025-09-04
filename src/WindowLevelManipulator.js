import { m as macro } from '@kitware/vtk.js/macros2.js';
import vtkCompositeCameraManipulator from '@kitware/vtk.js/Interaction/Manipulators/CompositeCameraManipulator.js';
import vtkCompositeMouseManipulator from '@kitware/vtk.js/Interaction/Manipulators/CompositeMouseManipulator.js';
import { j as cross } from '@kitware/vtk.js/Common/Core/Math/index.js';

// ----------------------------------------------------------------------------
// WindowLevelManipulator methods
// ----------------------------------------------------------------------------


function WindowLevelManipulator(publicAPI, model) {

    // Set our className
    model.classHierarchy.push('WindowLevelManipulator');
    publicAPI.onButtonDown = (interactor, renderer, position) => {
        model.previousPosition = position;
        model.windowLevelStartPosition[0] = position.x;
        model.windowLevelStartPosition[1] = position.y;
        // Get the last (the topmost) image
        // publicAPI.setCurrentImageNumber(model.currentImageNumber);
        const property = model.currentImageProperty;
        if (property) {
            model.windowLevelInitial[0] = property.getColorWindow();
            model.windowLevelInitial[1] = property.getColorLevel();
        }
    };
    publicAPI.onMouseMove = (interactor, renderer, position) => {
        if (!position) {
            return;
        }
        model.windowLevelCurrentPosition[0] = position.x;
        model.windowLevelCurrentPosition[1] = position.y;
        const rwi = model._interactor;
        if (model.currentImageProperty) {
            const size = rwi.getView().getViewportSize(renderer);
            const mWindow = model.windowLevelInitial[0];
            const level = model.windowLevelInitial[1];

            // Compute normalized delta
            let dx = (model.windowLevelCurrentPosition[0] - model.windowLevelStartPosition[0]) * 4.0 / size[0];
            let dy = (model.windowLevelStartPosition[1] - model.windowLevelCurrentPosition[1]) * 4.0 / size[1];



            // Scale by current values
            // if (Math.abs(mWindow) > 0.01) {
            // dx *= mWindow * 0.5;
            // } else {
            //     dx *= mWindow < 0 ? -0.01 : 0.01;
            // }
            // if (Math.abs(level) > 0.01) {
            // dy *= level * 0.5;
            // } else {
            //     dy *= level < 0 ? -0.01 : 0.01;
            // }
            dx *= 50;
            dy *= 50;
            // // Abs so that direction does not flip
            // if (mWindow < 0.0) {
            //     dx *= -1;
            // }
            // if (level < 0.0) {
            //     dy *= -1;
            // }

            // Compute new mWindow level
            let newWindow = dx + mWindow;
            const newLevel = level - dy;
            if (newWindow < 0.01) {
                newWindow = 0.01;
            }
            model.currentImageProperty.setColorWindow(newWindow);
            model.currentImageProperty.setColorLevel(newLevel);
            const doc = document.getElementById("mpr-window-level-div" + model._index);
            if (doc)
                doc.innerHTML = `W: ${newWindow.toFixed(0)} / L: ${newLevel.toFixed(0)}`;
        }
    };
    publicAPI.setInteractor = (interactor, index) => {
        model._index = index;
        model._interactor = interactor;

        const renderer = model._interactor.getCurrentRenderer();
        if (!renderer) {
            return;
        }
        function propMatch(j, prop, targetIndex) {
            return j === targetIndex && prop.getNestedPickable();
        }
        const props = renderer.getViewProps().filter(prop => prop.isA('vtkImageSlice'));
        let targetIndex = -1;
        targetIndex += props.length;
        const imageProp = props.find((prop, index) => propMatch(index, prop, targetIndex));
        if (imageProp) {
            model.currentImageProperty = imageProp.getProperty();
        }
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
    windowLevelInitial: [1.0, 0.5],
    _interactor: null,
    currentImageProperty: null,
    currentImageNumber: -1,
}
// ----------------------------------------------------------------------------

var WindowLevelManipulator$1 = {
    newInstance,
    extend,
};

export { WindowLevelManipulator$1 as default, extend, newInstance };
