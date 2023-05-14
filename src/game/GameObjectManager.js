import GameObject from "./GameObject";
import SafeArray from "../utils/SafeArray";

class GameObjectManager {
  constructor() {
    this.gameObjects = new SafeArray();
  }

  createGameObject(parent, name) {
    const gameObject = new GameObject(parent, name);
    this.gameObjects.add(gameObject);
    return gameObject;
  }

  removeGameObject(gameObject) {
    this.gameObjects.remove(gameObject);
  }

  update() {
    this.gameObjects.forEach((gameObject) => gameObject.update());
  }
}

export default GameObjectManager;
