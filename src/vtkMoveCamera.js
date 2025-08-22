import { m as macro } from '@kitware/vtk.js/macros2.js';
import vtkCompositeCameraManipulator from '@kitware/vtk.js/Interaction/Manipulators/CompositeCameraManipulator.js';
import vtkCompositeMouseManipulator from '@kitware/vtk.js/Interaction/Manipulators/CompositeMouseManipulator.js';
import { j as cross } from '@kitware/vtk.js/Common/Core/Math/index.js';

// ----------------------------------------------------------------------------
// vtkMouseCameraTrackballPanManipulator methods
// ----------------------------------------------------------------------------
var callbackFun = null;

function vtkMouseCameraTrackballPanManipulator(publicAPI, model) {
    let index = 0;
    // Set our className
    model.classHierarchy.push('vtkMouseCameraTrackballPanManipulator');
    publicAPI.onButtonDown = (interactor, renderer, position) => {
        model.previousPosition = position;
    };
    publicAPI.onMouseMove = (interactor, renderer, position) => {

        console.log('callBackFun', callbackFun, index);
        if (!position) {
            return;
        }

        const pos = position;
        const lastPos = model.previousPosition;
        // let deltaX = (pos.x - lastPos.x);
        // let deltaY = (lastPos.y - pos.y);
        // console.log('deltaX', deltaX, deltaY, deltaX / 2, deltaY / 2);
        // if (callbackFun) {
        //     callbackFun(index, deltaX / 2, deltaY / 2)
        // }
        model.previousPosition = position;
        const camera = renderer.getActiveCamera();
        const camPos = camera.getPosition();
        const fp = camera.getFocalPoint();
        if (camera.getParallelProjection()) {
            camera.orthogonalizeViewUp();
            const up = camera.getViewUp();
            const vpn = camera.getViewPlaneNormal();
            const right = [0, 0, 0];
            cross(vpn, up, right);

            // These are different because y is flipped.
            const height = interactor.getView().getViewportSize(renderer)[1];
            let dx = (pos.x - lastPos.x) / height;
            let dy = (lastPos.y - pos.y) / height;
            const scale = camera.getParallelScale();
            dx *= scale * 2.0;
            dy *= scale * 2.0;
            let tmp = right[0] * dx + up[0] * dy;
            camPos[0] += tmp;
            fp[0] += tmp;
            tmp = right[1] * dx + up[1] * dy;
            camPos[1] += tmp;
            fp[1] += tmp;
            tmp = right[2] * dx + up[2] * dy;
            camPos[2] += tmp;
            fp[2] += tmp;
            camera.setPosition(camPos[0], camPos[1], camPos[2]);
            camera.setFocalPoint(fp[0], fp[1], fp[2]);
        } else {
            const {
                center
            } = model;
            const style = interactor.getInteractorStyle();
            const focalDepth = style.computeWorldToDisplay(renderer, center[0], center[1], center[2])[2];
            const worldPoint = style.computeDisplayToWorld(renderer, pos.x, pos.y, focalDepth);
            const lastWorldPoint = style.computeDisplayToWorld(renderer, lastPos.x, lastPos.y, focalDepth);
            const newCamPos = [camPos[0] + (lastWorldPoint[0] - worldPoint[0]), camPos[1] + (lastWorldPoint[1] - worldPoint[1]), camPos[2] + (lastWorldPoint[2] - worldPoint[2])];
            const newFp = [fp[0] + (lastWorldPoint[0] - worldPoint[0]), fp[1] + (lastWorldPoint[1] - worldPoint[1]), fp[2] + (lastWorldPoint[2] - worldPoint[2])];
            camera.setPosition(newCamPos[0], newCamPos[1], newCamPos[2]);
            camera.setFocalPoint(newFp[0], newFp[1], newFp[2]);
        }
        renderer.resetCameraClippingRange();
        if (interactor.getLightFollowCamera()) {
            renderer.updateLightsGeometryToFollowCamera();
        }
    };

    publicAPI.setCallBack = (callback, i) => {
        callbackFun = callback;
        index = i;
    }
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {};

// ----------------------------------------------------------------------------

function extend(publicAPI, model) {
    let initialValues = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    Object.assign(model, DEFAULT_VALUES, initialValues);

    // Inheritance
    macro.obj(publicAPI, model);
    vtkCompositeCameraManipulator.extend(publicAPI, model, initialValues);
    vtkCompositeMouseManipulator.extend(publicAPI, model, initialValues);

    // Object specific methods
    vtkMouseCameraTrackballPanManipulator(publicAPI, model);
}

// ----------------------------------------------------------------------------

const newInstance = macro.newInstance(extend, 'vtkMouseCameraTrackballPanManipulator');

// ----------------------------------------------------------------------------

var vtkMouseCameraTrackballPanManipulator$1 = {
    newInstance,
    extend,
};

export { vtkMouseCameraTrackballPanManipulator$1 as default, extend, newInstance };
