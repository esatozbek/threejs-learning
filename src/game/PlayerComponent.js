import * as THREE from "three";
import Component from "./Component";
import SkinInstance from "./SkinInstanceComponent";

const kForward = new THREE.Vector3(0, 0, 1);

class Player extends Component {
  constructor(gameObject) {
    super(gameObject);
    const model = globals.models.knight;
    this.skinInstance = gameObject.addComponent(SkinInstance, model);
    this.skinInstance.setAnimation("Run");
    this.turnSpeed = globals.moveSpeed / 4;
    this.offscreenTimer = 0;
    this.maxTimeOffScreen = 3;
  }

  update() {
    const { deltaTime, moveSpeed, cameraInfo } = globals;
    const { transform } = this.gameObject;
    const delta =
      (globals.inputManager.keys.left.down ? 1 : 0) +
      (globals.inputManager.keys.right.down ? -1 : 0);
    transform.rotation.y += this.turnSpeed * delta * deltaTime;
    transform.translateOnAxis(kForward, moveSpeed * deltaTime);

    const { frustum } = cameraInfo;
    if (frustum.containsPoint(transform.position)) {
      this.offscreenTimer = 0;
    } else {
      this.offscreenTimer += deltaTime;
      if (this.offscreenTimer >= this.maxTimeOffScreen) {
        transform.position.set(0, 0, 0);
      }
    }
  }
}

export default Player;
