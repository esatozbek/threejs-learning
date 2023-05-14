import * as THREE from 'three';
import Component from './Component';

class StateDisplayHelper extends Component {
    constructor(gameObject, size) {
        super(gameObject);
        const labelContainerElem = document.querySelector('#labels');
        this.elem = document.createElement('div');
        labelContainerElem.appendChild(this.elem);
        this.pos = new THREE.Vector3();

        this.helper = new THREE.PolarGridHelper(size / 2, 1, 1, 16);
        gameObject.transform.add(this.helper);
    }

    setState(s) {
        this.elem.textContent = s;
    }

    setColor(cssColor) {
        this.elem.style.color = cssColor;
        this.helper.material.color.set(cssColor);
    }

    update() {
        this.helper.visible = globals.debug;
        if (!globals.debug) {
            return;
        }

        const { pos } = this;
        const { transform } = this.gameObject;
        const { canvas } = globals;
        pos.copy(transform.position);

        // get the normalized screen coordinate of that position
        // x and y will be in the -1 to +1 range with x = -1 being
        // on the left and y = -1 being on the bottom
        pos.project(globals.camera);

        // convert the normalized position to CSS coordinates
        const x = (pos.x * .5 + .5) * canvas.clientWidth;
        const y = (pos.y * -.5 + .5) * canvas.clientHeight;

        // move the elem to that position
        this.elem.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
    }
}

export default StateDisplayHelper;