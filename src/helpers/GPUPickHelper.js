import * as THREE from "three";

class GPUPickHelper {
  constructor(renderer, camera, idToObject) {
    // create a 1x1 pixel render target
    this.pickingTexture = new THREE.WebGLRenderTarget(1, 1);
    this.pixelBuffer = new Uint8Array(4);
    this.pickedObject = null;
    this.pickedObjectSavedColor = 0;
    this.renderer = renderer;
    this.camera = camera;
    this.idToObject = idToObject;
  }
  pick(cssPosition, scene, camera, time) {
    const { pickingTexture, pixelBuffer } = this;

    // restore the color if there is a picked object
    if (this.pickedObject) {
      this.pickedObject.material.emissive.setHex(this.pickedObjectSavedColor);
      this.pickedObject = undefined;
    }

    // set the view offset to represent just a single pixel under the mouse
    const pixelRatio = this.renderer.getPixelRatio();
    this.camera.setViewOffset(
      this.renderer.getContext().drawingBufferWidth, // full width
      this.renderer.getContext().drawingBufferHeight, // full top
      (cssPosition.x * pixelRatio) | 0, // rect x
      (cssPosition.y * pixelRatio) | 0, // rect y
      1, // rect width
      1 // rect height
    );
    // render the scene
    this.renderer.setRenderTarget(pickingTexture);
    this.renderer.render(scene, this.camera);
    this.renderer.setRenderTarget(null);
    // clear the view offset so rendering returns to normal
    this.camera.clearViewOffset();
    //read the pixel
    this.renderer.readRenderTargetPixels(
      pickingTexture,
      0, // x
      0, // y
      1, // width
      1, // height
      pixelBuffer
    );

    const id = (pixelBuffer[0] << 16) | (pixelBuffer[1] << 8) | pixelBuffer[2];

    const intersectedObject = this.idToObject[id];
    if (intersectedObject) {
      // pick the first object. It's the closest one
      this.pickedObject = intersectedObject;
      // save its color
      this.pickedObjectSavedColor =
        this.pickedObject.material.emissive.getHex();
      // set its emissive color to flashing red/yellow
      this.pickedObject.material.emissive.setHex(
        (time * 8) % 2 > 1 ? 0xffff00 : 0xff0000
      );
    }
  }
}

export default GPUPickHelper;
