import * as THREE from "three";

class GPUPickHelperForGlobe {
  constructor() {
    // create a 1x1 pixel render target
    this.pickingTexture = new THREE.WebGLRenderTarget(1, 1);
    this.pixelBuffer = new Uint8Array(4);
  }

  pick(cssPosition, scene, camera, renderer) {
    const { pickingTexture, pixelBuffer } = this;

    // set the view offset to represent just a single pixel under the mouse
    const pixelRatio = renderer.getPixelRatio();
    camera.setViewOffset(
      renderer.getContext().drawingBufferWidth, // full width
      renderer.getContext().drawingBufferHeight, // full top
      (cssPosition.x * pixelRatio) | 0, // rect x
      (cssPosition.y * pixelRatio) | 0, // rect y
      1, // rect width
      1 // rect height
    );
    // render the scene
    renderer.setRenderTarget(pickingTexture);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    // clear the view offset so rendering returns to normal
    camera.clearViewOffset();
    //read the pixel
    renderer.readRenderTargetPixels(
      pickingTexture,
      0, // x
      0, // y
      1, // width
      1, // height
      pixelBuffer
    );

    const id =
      (pixelBuffer[0] << 0) | (pixelBuffer[1] << 8) | (pixelBuffer[2] << 16);

    return id;
  }
}

export default GPUPickHelperForGlobe;
