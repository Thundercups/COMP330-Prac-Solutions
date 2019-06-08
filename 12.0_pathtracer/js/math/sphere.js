
"use strict";

class Sphere {
    constructor (centre, radius) {
        this.centre = centre;
        this.radius = radius;
    }

    checkHit (ray, tMin, tMax) {
        const oc = Vector3.sub(ray.origin, this.centre);
        const a = Vector3.dot(ray.direction, ray.direction);
        const b = Vector3.dot(oc, ray.direction);
        const c = Vector3.dot(oc, oc) - (this.radius * this.radius);
        const discriminant = (b * b) - (a * c);
        if (discriminant > 0.0) {
            const negative = (-b - Math.sqrt((b * b) - (a * c))) / a;
            const positive = (-b + Math.sqrt((b * b) - (a * c))) / a;
            if (negative > tMin && negative < tMax) {
                const position = ray.pointAtParameter(negative);
                const normal = Vector3.div(Vector3.sub(position, this.centre), this.radius);
                return new RayHit(negative, position, normal);
            }
            else if (positive > tMin && positive < tMax) {
                const position = ray.pointAtParameter(positive);
                const normal = Vector3.div(Vector3.sub(position, this.centre), this.radius);
                return new RayHit(positive, position, normal);
            }
            else {
                return null;
            }
        }
        else {
            return null;
        }
    }
}
