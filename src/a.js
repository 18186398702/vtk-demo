import { m as macro } from '@kitware/vtk.js/macros2.js';
import vtkInteractorStyleTrackballCamera from '@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera';
import { r as radiansFromDegrees } from '@kitware/vtk.js/Common/Core/Math/index.js';
import { States } from '@kitware/vtk.js/Rendering/Core/InteractorStyle/Constants.js';
import vtkLineSource from '@kitware/vtk.js/Filters/Sources/LineSource';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
// ----------------------------------------------------------------------------
// vtkInteractorStyleImage methods
// ----------------------------------------------------------------------------

function vtkInteractorStyleImage(publicAPI, model) {
    // Set our className
    console.log('vtkInteractorStyleImage');
    model.classHierarchy.push('vtkInteractorStyleImage');

    // Public API methods
    publicAPI.superHandleMouseMove = publicAPI.handleMouseMove;
    publicAPI.handleMouseMove = callData => {
        const pos = callData.position;
        const renderer = model.getRenderer(callData);
        switch (model.state) {
            case States.IS_WINDOW_LEVEL:
                publicAPI.windowLevel(renderer, pos);
                publicAPI.invokeInteractionEvent({
                    type: 'InteractionEvent'
                });
                break;
            case States.IS_SLICE:
                publicAPI.slice(renderer, pos);
                publicAPI.invokeInteractionEvent({
                    type: 'InteractionEvent'
                });
                break;
        }
        publicAPI.superHandleMouseMove(callData);
    };

    //----------------------------------------------------------------------------
    publicAPI.superHandleLeftButtonPress = publicAPI.handleLeftButtonPress;
    publicAPI.handleLeftButtonPress = callData => {
        const renderer = callData.firstRenderer;
        const position = callData.position;
        console.log('handleLeftButtonPress', callData);
        let startPosition = [position[0], position[1]];
        let endPosition = [position[0], position[1]];

        // 创建线源、映射器和演员
        const lineSource = vtkLineSource.newInstance();
        lineSource.setPoint1(startPosition[0], startPosition[1], 0);
        lineSource.setPoint2(endPosition[0], endPosition[1], 0);
        const mapper = vtkMapper.newInstance();
        mapper.setInputConnection(lineSource.getOutputPort());

        const lineActor = vtkActor.newInstance();
        lineActor.getProperty().setPointSize(10);
        lineActor.setMapper(mapper);

        renderer.addActor(lineActor);
    };

    //--------------------------------------------------------------------------
    publicAPI.superHandleLeftButtonRelease = publicAPI.handleLeftButtonRelease;
    publicAPI.handleLeftButtonRelease = () => {
        switch (model.state) {
            case States.IS_WINDOW_LEVEL:
                publicAPI.endWindowLevel();
                break;
            case States.IS_SLICE:
                publicAPI.endSlice();
                break;
            default:
                publicAPI.superHandleLeftButtonRelease();
                break;
        }
    };

    //--------------------------------------------------------------------------
    publicAPI.handleStartMouseWheel = () => {
        publicAPI.startSlice();
    };

    //--------------------------------------------------------------------------
    publicAPI.handleEndMouseWheel = () => {
        publicAPI.endSlice();
    };

    //--------------------------------------------------------------------------
    publicAPI.handleMouseWheel = callData => {
        const camera = model.getRenderer(callData).getActiveCamera();
        let distance = camera.getDistance();
        distance += callData.spinY;

        // clamp the distance to the clipping range
        const range = camera.getClippingRange();
        if (distance < range[0]) {
            distance = range[0];
        }
        if (distance > range[1]) {
            distance = range[1];
        }
        camera.setDistance(distance);
        const props = model.getRenderer(callData).getViewProps().filter(prop => prop.isA('vtkImageSlice'));
        props.forEach(prop => {
            if (prop.getMapper().isA('vtkImageResliceMapper')) {
                const p = prop.getMapper().getSlicePlane();
                if (p) {
                    p.push(callData.spinY);
                    p.modified();
                    prop.getMapper().modified();
                }
            }
        });
    };

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
                dx *= mWindow;
            } else {
                dx *= mWindow < 0 ? -0.01 : 0.01;
            }
            if (Math.abs(level) > 0.01) {
                dy *= level;
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

    //----------------------------------------------------------------------------
    publicAPI.slice = (renderer, position) => {
        const rwi = model._interactor;
        const dy = position.y - model.lastSlicePosition;
        const camera = renderer.getActiveCamera();
        const range = camera.getClippingRange();
        let distance = camera.getDistance();

        // scale the interaction by the height of the viewport
        let viewportHeight = 0.0;
        if (camera.getParallelProjection()) {
            viewportHeight = 2.0 * camera.getParallelScale();
        } else {
            const angle = radiansFromDegrees(camera.getViewAngle());
            viewportHeight = 2.0 * distance * Math.tan(0.5 * angle);
        }
        const size = rwi.getView().getSize();
        const delta = dy * viewportHeight / size[1];
        distance += delta;

        // clamp the distance to the clipping range
        if (distance < range[0]) {
            distance = range[0] + viewportHeight * 1e-3;
        }
        if (distance > range[1]) {
            distance = range[1] - viewportHeight * 1e-3;
        }
        camera.setDistance(distance);
        model.lastSlicePosition = position.y;
    };

    //----------------------------------------------------------------------------
    // This is a way of dealing with images as if they were layers.
    // It looks through the renderer's list of props and sets the
    // interactor ivars from the Nth image that it finds.  You can
    // also use negative numbers, i.e. -1 will return the last image,
    // -2 will return the second-to-last image, etc.
    publicAPI.setCurrentImageNumber = i => {
        if (i === null) {
            return;
        }
        const renderer = model._interactor.getCurrentRenderer();
        if (!renderer) {
            return;
        }
        model.currentImageNumber = i;
        function propMatch(j, prop, targetIndex) {
            return j === targetIndex && prop.getNestedPickable();
        }
        const props = renderer.getViewProps().filter(prop => prop.isA('vtkImageSlice'));
        let targetIndex = i;
        if (i < 0) {
            targetIndex += props.length;
        }
        const imageProp = props.find((prop, index) => propMatch(index, prop, targetIndex));
        if (imageProp) {
            publicAPI.setCurrentImageProperty(imageProp.getProperty());
        }
    };

    //----------------------------------------------------------------------------
    publicAPI.setCurrentImageProperty = imageProperty => {
        model.currentImageProperty = imageProperty;
    };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
    windowLevelStartPosition: [0, 0],
    windowLevelCurrentPosition: [0, 0],
    lastSlicePosition: 0,
    windowLevelInitial: [1.0, 0.5],
    // currentImageProperty: null,
    currentImageNumber: -1,
    interactionMode: 'IMAGE2D',
    xViewRightVector: [0, 1, 0],
    xViewUpVector: [0, 0, -1],
    yViewRightVector: [1, 0, 0],
    yViewUpVector: [0, 0, -1],
    zViewRightVector: [1, 0, 0],
    zViewUpVector: [0, 1, 0]
};

// ----------------------------------------------------------------------------

function extend(publicAPI, model) {
    let initialValues = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    Object.assign(model, DEFAULT_VALUES, initialValues);

    // Inheritance
    vtkInteractorStyleTrackballCamera.extend(publicAPI, model, initialValues);

    // Create get-set macros
    macro.setGet(publicAPI, model, ['interactionMode']);
    macro.get(publicAPI, model, ['currentImageProperty']);

    // For more macro methods, see "Sources/macros.js"

    // Object specific methods
    vtkInteractorStyleImage(publicAPI, model);
}

// ----------------------------------------------------------------------------

const newInstance = macro.newInstance(extend, 'vtkInteractorStyleImage');

// ----------------------------------------------------------------------------

var vtkInteractorStyleImage$1 = {
    newInstance,
    extend
};

export { vtkInteractorStyleImage$1 as default, extend, newInstance };
