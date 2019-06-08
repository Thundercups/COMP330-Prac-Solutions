
"use strict";

class Ray3 {
    constructor (origin, direction) {
        if (DEBUG) {
            console.assert(origin instanceof Vector3);
            console.assert(direction instanceof Vector3);
        }
        this.origin = origin;
        this.direction = direction;
    }

    pointAtParameter (t) {
        return Vector3.add(this.origin, Vector3.mul(this.direction, t));
    }
}
