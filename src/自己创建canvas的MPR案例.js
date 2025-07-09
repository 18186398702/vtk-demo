function ccc() {
    console.log("imageData", imageData, windowWidth, windowCenter)
    const axialCanvas = document.getElementById('axial');
    const coronalCanvas = document.getElementById('coronal');
    const sagittalCanvas = document.getElementById('sagittal');
    const widget = vtkResliceCursorWidget.newInstance();
    const widgetState = widget.getWidgetState();
    widget.setImage(imageData);
    let objArr = []
    const createVTIObject = (canvas, imageData, widget, viewtype) => {
        let obj = { viewtype: viewtype }
        obj.reslice = vtkImageReslice.newInstance();
        // 设置重切割操作的切片数量为 1，表示只取一个切片
        obj.reslice.setSlabNumberOfSlices(1);
        // 设置是否使用变换来输入采样，false 表示不使用变换
        obj.reslice.setTransformInputSampling(false);
        // 设置输出图像是否自动裁剪，true 表示输出图像会根据内容自动裁剪
        obj.reslice.setAutoCropOutput(true);
        // 设置输出图像的维度为 2，表示输出为 2D 图像（通常用于切片视图）
        obj.reslice.setOutputDimensionality(2);
        // 创建一个 vtkImageMapper 实例，用于映射图像数据
        obj.resliceMapper = vtkImageMapper.newInstance();
        obj.resliceMapper.setSliceAtFocalPoint(true); // 确保切片在焦点处
        // 将 vtkImageReslice 的输出连接到映射器，确保映射器能渲染重切割后的图像
        obj.resliceMapper.setInputConnection(obj.reslice.getOutputPort());
        // 创建一个 vtkImageSlice 实例，用于显示图像切片
        obj.resliceActor = vtkImageSlice.newInstance();
        // 将映射器应用到 vtkImageSlice 上，以便它能够渲染图像
        obj.resliceActor.setMapper(obj.resliceMapper);
        obj.reslice.setInputData(imageData);
        const grw = vtkGenericRenderWindow.newInstance();
        const render = grw.getRenderer()
        obj.widgetManager = vtkWidgetManager.newInstance()
        obj.widgetManager.setRenderer(render);

        obj.widgetInstance = obj.widgetManager.addWidget(widget, viewtype);
        obj.widgetInstance.setKeepOrthogonality(true);
        console.log(canvas)
        const ctx = canvas.getContext('2d');
        //canvas加监听点击事件
        canvas.addEventListener('click', function (e) {
            // 获取点击位置的坐标
            const x = e.clientX;
            const y = e.clientY;
            // 获取 canvas 元素的边界信息
            const rect = canvas.getBoundingClientRect();
            // 计算点击位置的 X 和 Y 坐标（相对于 canvas）
            const xCanvas = x - rect.left;
            const yCanvas = y - rect.top;
            console.log(viewtype, xCanvas, yCanvas);
            let center = widget.get().widgetState.getCenter();
            console.log("center", widget, widget.get().widgetState.getRotationHandleXinY0(), widget.get().widgetState.getCenter());
            console.log("widgetInstance", obj.widgetInstance)
            if (obj.viewtype == 4) {
                center[1] = xCanvas;
                center[2] = yCanvas;
            } else if (obj.viewtype == 5) {
                center[0] = xCanvas;
                center[2] = yCanvas;
            } else {
                center[0] = xCanvas;
                center[1] = yCanvas;
            }
            // widget.setCenter(center);
            obj.widgetInstance.rotateLineInView("YinX", -Math.PI / 4)
            obj.widgetInstance.rotateLineInView("YinZ", -Math.PI / 4)
            // obj.widgetInstance.rotateLineInView("YinX", 90)
            //  obj.widgetInstance.invokeInteractionEvent("rotateLine")
            updateMPR(widget, objArr, center, windowWidth, windowCenter);
        })
        obj.ctx = ctx;
        objArr.push(obj)
    }
    createVTIObject(axialCanvas, imageData, widget, 4)
    createVTIObject(coronalCanvas, imageData, widget, 5)
    createVTIObject(sagittalCanvas, imageData, widget, 6)
    console.log(widgetState.getCenter())
    let center = [200.801, 200.801, 22]
    widget.setCenter(center);
    let otherLineHandle = objArr[0].widgetInstance.getOtherLineHandle("XinY")
    let otherLineVector = otherLineHandle.getDirection()
    console.log("XinY", otherLineVector)
    otherLineHandle = objArr[0].widgetInstance.getOtherLineHandle("ZinY")
    otherLineVector = otherLineHandle.getDirection()
    console.log("ZinY", otherLineVector)
    otherLineHandle = objArr[0].widgetInstance.getOtherLineHandle("ZinX")
    otherLineVector = otherLineHandle.getDirection()
    console.log("ZinX", otherLineVector)
    otherLineHandle = objArr[0].widgetInstance.getOtherLineHandle("YinX")
    otherLineVector = otherLineHandle.getDirection()
    console.log("YinX", otherLineVector)
    otherLineHandle = objArr[0].widgetInstance.getOtherLineHandle("XinZ")
    otherLineVector = otherLineHandle.getDirection()
    console.log("XinZ", otherLineVector)
    otherLineHandle = objArr[0].widgetInstance.getOtherLineHandle("YinZ")
    otherLineVector = otherLineHandle.getDirection()
    console.log("YinZ", otherLineVector)
    // widget.get().widgetState.setRotationHandleXinY0(45)
    console.log("widget", widget.get())
    console.log("objArr", widget.get().behavior, widget.get().widgetState.getStatesWithLabel('rotation'))
    console.log(widget.get().widgetState.getStatesWithLabel("sphere")[1].getState())
    //  widget.get().widgetState.getStatesWithLabel('rotation')[0].setOffset()
    updateMPR(widget, objArr, center, windowWidth, windowCenter)
    console.log("widgetState", widgetState, widgetState.getCenter(), widgetState.getAxisXinY().get());
}

function updateMPR(widget, objArr, center, windowWidth, windowCenter) {
    for (let obj of objArr) {
        const modified = widget.updateReslicePlane(
            obj.reslice,
            obj.viewtype
        );
        let resliceAxes = obj.reslice.getResliceAxes();
        obj.resliceActor.setUserMatrix(resliceAxes);
        const imageData2 = obj.reslice.getOutputData()
        const image = imageData2.getPointData().getScalars().getData();
        const width = imageData2.getDimensions()[0];
        const height = imageData2.getDimensions()[1];
        const bounds = obj.resliceActor.getBounds();
        const spacing = imageData2.getSpacing()
        console.log(obj.viewtype, imageData2.getDimensions(), imageData2.getSpacing(), obj.resliceActor.getBounds())
        //计算切片像素
        const displayX = bounds[1] - bounds[0];  // X轴方向显示宽度
        const displayY = bounds[3] - bounds[2]; // Y轴方向显示高度
        const displayZ = bounds[5] - bounds[4]; // Y轴方向显示高度
        let imgwidth = 0
        let imgheight = 0
        let linesX = 0
        let linesY = 0

        imgwidth = width * spacing[0];
        imgheight = height * spacing[1];
        if (obj.viewtype == 4) {
            // imgwidth = displayY;
            // imgheight = displayZ;
            linesX = center[1]
            linesY = center[2]
        } else if (obj.viewtype == 5) {
            // imgwidth = displayX;
            // imgheight = displayZ;
            linesX = center[0]
            linesY = center[2]
        } else {
            // imgwidth = displayX;
            // imgheight = displayY;
            linesX = center[0]
            linesY = center[1]
        }
        console.log(image)
        const rgbaBuffer = dicom_to_8byte_from_hight_byte_at_ww_wl(image, windowCenter, windowWidth)
        const imageDataObj = new ImageData(new Uint8ClampedArray(rgbaBuffer), width, height);

        // 创建临时Canvas存放ImageData
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imageDataObj, 0, 0);
        let ctx = obj.ctx;
        ctx.clearRect(0, 0, 520, 520);
        ctx.drawImage(tempCanvas, 0, 0, width, height, 0, 0, imgwidth, imgheight);
        ctx.strokeStyle = 'orange';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(linesX, 0);
        ctx.lineTo(linesX, 520);
        ctx.moveTo(0, linesY);
        ctx.lineTo(520, linesY);
        ctx.stroke();
    }
}

function dicom_to_8byte_from_hight_byte_at_ww_wl(pixdate, wl_y, ww) {
  //计算最小值
  var min = Math.min(pixdate);
  //拨正
  var wl = wl_y;
  if (min < 0) {
    for (var pix_num = 0; pix_num < pixdate.length; pix_num++) {
      pixdate[pix_num] = pixdate[pix_num] - min;
    }
    var wl = wl_y - min;
  }

  const window_min = (wl - ww / 2);
  const window_max = (wl + ww / 2);
  const ww_wl_a = (255 / ww);
  const ww_wl_b = ((window_min * 255) / ww);
  var lut = new Uint8ClampedArray(65536);
  var lueLenght = lut.length
  for (var i = 0; i < lueLenght; i++) {
    if (i < window_min) {
      lut[i] = 0;
    } else if (i > window_max) {
      lut[i] = 255;
    } else {
      lut[i] = parseInt(i * ww_wl_a - ww_wl_b);
    }
  }

  const pixdataLenght = pixdate.length
  var pixUint8ArrTC = new Uint8Array(pixdataLenght * 4)
  for (var a = 0, b = 0; a < pixdataLenght; a++) {
    let lut_val = lut[pixdate[a]];
    if (lut_val == undefined) {
      lut_val = lut[Math.round(pixdate[a])];
    }
    pixUint8ArrTC[b] = pixUint8ArrTC[b + 1] = pixUint8ArrTC[b + 2] = lut_val;
    pixUint8ArrTC[b + 3] = 255;
    b += 4;
  }
  return pixUint8ArrTC
}