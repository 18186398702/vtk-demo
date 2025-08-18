import { m as macro } from "@kitware/vtk.js/macros2.js"
// import { r as radiansFromDegrees } from '@kitware/vtk.js/Common/Core/Math/index.js';
// import { States } from '@kitware/vtk.js/Rendering/Core/InteractorStyle/Constants.js';
import vtkInteractorStyleImage from '@kitware/vtk.js/Interaction/Style/InteractorStyleImage';

function windowlevelStyle(publicAPI, model) {
    // Set our className
    console.log('windowlevelStyle');
    model.classHierarchy.push('windowlevelStyle');

    // Public API methods
    //----------------------------------------------------------------------------
    publicAPI.windowLevel = (renderer, position) => {
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
            if (Math.abs(mWindow) > 0.01) {
                dx *= mWindow * 0.3;
            } else {
                dx *= mWindow < 0 ? -0.01 : 0.01;
            }
            if (Math.abs(level) > 0.01) {
                dy *= level * 0.3;
            } else {
                dy *= level < 0 ? -0.01 : 0.01;
            }

            // Abs so that direction does not flip
            if (mWindow < 0.0) {
                dx *= -1;
            }
            if (level < 0.0) {
                dy *= -1;
            }

            // Compute new mWindow level
            let newWindow = dx + mWindow;
            const newLevel = level - dy;
            if (newWindow < 0.01) {
                newWindow = 0.01;
            }
            model.currentImageProperty.setColorWindow(newWindow);
            model.currentImageProperty.setColorLevel(newLevel);
        }
    };


}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------


// ----------------------------------------------------------------------------

function extend(publicAPI, model) {
    let initialValues = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    // Object.assign(model, DEFAULT_VALUES, initialValues);

    // Inheritance
    vtkInteractorStyleImage.extend(publicAPI, model, initialValues);

    // Create get-set macros
    // macro.setGet(publicAPI, model, ['interactionMode']);
    // macro.get(publicAPI, model, ['currentImageProperty']);

    // For more macro methods, see "Sources/macros.js"
    console.log("publicAPI", publicAPI);
    // Object specific methods
    windowlevelStyle(publicAPI, model);
}

// ----------------------------------------------------------------------------

const newInstance = macro.newInstance(extend, 'windowlevelStyle');
console.log("newInstance", newInstance);
// ----------------------------------------------------------------------------

var windowlevelStyle$1 = {
    newInstance,
    extend
};

export { windowlevelStyle$1 as default, extend, newInstance };
