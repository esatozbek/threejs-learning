import SkinInstance from "./SkinInstanceComponent";

// Returns true of obj1 and obj2 are close
function isClose(obj1, obj1Radius, obj2, obj2Radius) {
  const minDist = obj1Radius + obj2Radius;
  const dist = obj1.position.distanceTo(obj2.position);
  return dist < minDist;
}

// keeps v between -min and +min
function minMagnitude(v, min) {
  return Math.abs(v) > min ? min * Math.sign(v) : v;
}

const aimTowardAndGetDistance = (function () {
  const delta = new THREE.Vector3();

  return function aimTowardAndGetDistance(source, targetPos, maxTurn) {
    delta.subVectors(targetPos, source.position);
    // compute the direction we want to be facing
    const targetRot = Math.atan2(delta.x, delta.z) + Math.PI * 1.5;
    // rotate in the shortest direction
    const deltaRot =
      ((targetRot - source.rotation.y + Math.PI * 1.5) % (Math.PI * 2)) -
      Math.PI;
    // make sure we don't turn faster than maxTurn
    const deltaRotation = minMagnitude(deltaRot, maxTurn);
    // keep rotation between 0 and Math.PI * 2
    source.rotation.y = THREE.MathUtils.euclideanModulo(
      source.rotation.y + deltaRotation,
      Math.PI * 2
    );
    // return the distance to the target
    return delta.length();
  };
})();
å;

class Animal extends Component {
  constructor(gameObject, model) {
    super(gameObject);
    const hitRadius = model.size / 2;
    const skinInstance = gameObject.addComponent(SkinInstance, model);
    skinInstance.mixer.timeScale = globals.moveSpeed / 4;
    const transform = gameObject.transform;
    const playerTransform = globals.player.gameObject.transform;
    const maxTurnSpeed = Math.PI * (globals.moveSpeed / 4);
    const targetHistory = [];
    let targetNdx = 0;

    function addHistory() {
      const targetGO = globals.congaLine[targetNdx];
      const newTargetPos = new THREE.Vector3();
      newTargetPos.copy(targetGO.transform.position);
      targetHistory.push(newTargetPos);
    }

    this.fsm = new FiniteStateMachine(
      {
        idle: {
          enter: () => {
            skinInstance.setAnimation("Idle");
          },
          update: () => {
            // check if player is near
            if (
              isClose(
                transform,
                hitRadius,
                playerTransform,
                globals.playerRadius
              )
            ) {
              this.fsm.transition("waitForEnd");
            }
          },
        },
        waitForEnd: {
          enter: () => {
            skinInstance.setAnimation("Jump");
          },
          update: () => {
            // get the gameObject at the end of the conga line
            const lastGO = globals.congaLine[globals.congaLine.length - 1];
            const deltaTurnSpeed = maxTurnSpeed * globals.deltaTime;
            const targetPos = lastGO.transform.position;
            aimTowardAndGetDistance(transform, targetPos, deltaTurnSpeed);
            // check if last thing in conga line is near
            if (
              isClose(
                transform,
                hitRadius,
                lastGO.transform,
                globals.playerRadius
              )
            ) {
              this.fsm.transition("goToLast");
            }
          },
        },
        goToLast: {
          enter: () => {
            // remember who we're following
            targetNdx = globals.congaLine.length - 1;
            // add ourselves to the conga line
            globals.congaLine.push(gameObject);
            skinInstance.setAnimation("Walk");
          },
          update: () => {
            addHistory();
            // walk to the oldest point in the history
            const targetPos = targetHistory[0];
            const maxVelocity = globals.moveSpeed * globals.deltaTime;
            const deltaTurnSpeed = maxTurnSpeed * globals.deltaTime;
            const distance = aimTowardAndGetDistance(
              transform,
              targetPos,
              deltaTurnSpeed
            );
            const velocity = distance;
            transform.translateOnAxis(
              kForward,
              Math.min(velocity, maxVelocity)
            );
            if (distance <= maxVelocity) {
              this.fsm.transition("follow");
            }
          },
        },
        follow: {
          update: () => {
            addHistory();
            // remove the oldest history and just put ourselves there.
            const targetPos = targetHistory.shift();
            transform.position.copy(targetPos);
            const deltaTurnSpeed = maxTurnSpeed * globals.deltaTime;
            aimTowardAndGetDistance(
              transform,
              targetHistory[0],
              deltaTurnSpeed
            );
          },
        },
      },
      "idle"
    );
  }

  update() {
    this.fsm.update();
  }
}

export default Animal;
