
"use strict";

const PathtracingMaterialType = {
    DIFFUSE: 0,

};

class PathtracingCamera {
    constructor (lookFrom, lookAt, verticalUp, verticalFov, aspect) {
        const theta = verticalFov * Math.PI / 180.0;
        const halfHeight = Math.tan(theta / 2.0);
        const halfWidth = aspect * halfHeight;
        this.origin = lookFrom;
        const w = Vector3.normalize(Vector3.sub(lookFrom, lookAt));
        const u = Vector3.normalize(Vector3.cross(verticalUp, w));
        const v = Vector3.cross(w, u);
        this.lowerLeftCorner = Vector3.sub(Vector3.sub(Vector3.sub(this.origin, Vector3.mul(u, halfWidth)), Vector3.mul(v, halfHeight)), w);
        this.horizontal = Vector3.mul(u, 2.0 * halfWidth);
        this.vertical = Vector3.mul(v, 2.0 * halfHeight);
    }

    getRay (s, t) {
        return new Ray3(this.origin, Vector3.sub(Vector3.add(this.lowerLeftCorner, Vector3.add(Vector3.mul(this.horizontal, s), Vector3.mul(this.vertical, t))), this.origin));
    }
}

class PathtracingObject3D {
    constructor (sphere, material) {
        this.sphere = sphere;
        this.material = material;
    }
}

class PathtracingMaterialDiffuse {
    constructor (albedo) {
        this.albedo = albedo;
    }

    scatter (ray, rayHit) {
        const target = Vector3.add(Vector3.add(rayHit.position, rayHit.normal), randomInUnitSphere());
        const scatter = new Ray3(rayHit.position, Vector3.sub(target, rayHit.position));
        const attenuation = this.albedo;
        return new ScatterAttenuation(scatter, attenuation);
    }
}

class PathtracingMaterialMetal {
    constructor (albedo, roughness) {
        this.albedo = albedo;
        this.roughness = roughness;
    }

    scatter (ray, rayHit) {
        const directionNormalized = Vector3.normalize(ray.direction);
        const reflected = Vector3.reflect(directionNormalized, rayHit.normal);
        const scatter = new Ray3(rayHit.position, Vector3.add(reflected, Vector3.mul(randomInUnitSphere(), this.roughness)));
        const attenuation = this.albedo;
        if (Vector3.dot(scatter.direction, rayHit.normal) > 0.0) {
            return new ScatterAttenuation(scatter, attenuation);
        }
        else {
            return null;
        }
    }
}

class PathtracingMaterialGlass {
    constructor (albedo, refractiveIndex) {
        this.albedo = albedo;
        this.refractiveIndex = refractiveIndex;
    }

    scatter (ray, rayHit) {
        const reflected = Vector3.reflect(ray.direction, rayHit.normal);
        //const attenuation = new Vector3(1.0, 1.0, 1.0);

        let niOverNt = 1.0;
        let outwardNormal = new Vector3(0.0, 0.0, 0.0);
        let cosine = 0.0;
        const rayDotNormal = Vector3.dot(ray.direction, rayHit.normal);
        if (rayDotNormal > 0.0) {
            outwardNormal = Vector3.negate(rayHit.normal);
            niOverNt = this.refractiveIndex;
            cosine = this.refractiveIndex * rayDotNormal / ray.direction.length();
        }
        else {
            outwardNormal = rayHit.normal.clone();
            niOverNt = 1.0 / this.refractiveIndex;
            cosine = -rayDotNormal / ray.direction.length();
        }

        const refracted = Vector3.refract(ray.direction, outwardNormal, niOverNt);
        let reflectionProbability = 0.0;
        if (refracted !== null) {
            reflectionProbability = schlick(cosine, this.refractiveIndex);
        }
        else {
            reflectionProbability = 1.0;
        }

        if (Math.random() < reflectionProbability) {
            return new ScatterAttenuation(
                new Ray3(rayHit.position, reflected),
                //new Vector3(1.0, 1.0, 1.0),
                this.albedo,
            );
        }
        else {
            return new ScatterAttenuation(
                new Ray3(rayHit.position, refracted),
                //new Vector3(1.0, 1.0, 1.0),
                this.albedo,
            );
        }
    }
}

class ScatterAttenuation {
    constructor (scatter, attenuation) {
        this.scatter = scatter;
        this.attenuation = attenuation;
    }
}

class PathtracingObjectHit {
    constructor (object, hit) {
        this.object = object;
        this.hit = hit;
    }
}

function pathtracingTestHits (objects, ray, tMin, tMax) {
    let closestRayHit = new RayHit(tMax, new Vector3(0.0, 0.0, 0.0), new Vector3(0.0, 0.0, 1.0));
    let closestObject = null;
    let hitAnything = false;
    for (let i = 0; i < objects.length; i++) {
        const object = objects[i];
        const hit = object.sphere.checkHit(ray, tMin, closestRayHit.t);
        if (hit !== null) {
            closestRayHit = hit;
            closestObject = object;
            hitAnything = true;
        }
    }

    if (hitAnything) {
        return new PathtracingObjectHit(closestObject, closestRayHit);
    }
    else {
        return null;
    }
}

function randomInUnitSphere () {
    let v = new Vector3(1.0, 1.0, 1.0);
    const offset = new Vector3(1.0, 1.0, 1.0);
    const random = new Vector3(0.0, 0.0, 0.0);
    while (v.squared_length() >= 1.0) {
        random.x = Math.random() * 2.0;
        random.y = Math.random() * 2.0;
        random.z = Math.random() * 2.0;
        v = Vector3.sub(random, offset);
    }
    return v;
}

function schlick (cosine, refractiveIndex) {
    let r0 = (1.0 - refractiveIndex) / (1.0 + refractiveIndex);
    r0 *= r0;
    return r0 + ((1.0 - r0) * Math.pow((1.0 - cosine), 5.0));
}

function pathtracingSampleScene (objects, ray, depth) {
    const objectHit = pathtracingTestHits(objects, ray, 0.001, 1000000.0);
    if (objectHit !== null) {
        if (depth > 0) {
            const scatterAttenuation = objectHit.object.material.scatter(ray, objectHit.hit);
            if (scatterAttenuation !== null) {
                const sample = pathtracingSampleScene(objects, scatterAttenuation.scatter, depth - 1);
                return new Vector3(
                    sample.x * scatterAttenuation.attenuation.x,
                    sample.y * scatterAttenuation.attenuation.y,
                    sample.z * scatterAttenuation.attenuation.z,
                );
            }
            else {
                return new Vector3(0.0, 0.0, 0.0);
            }
        }
        else {
            return new Vector3(0.0, 0.0, 0.0);
        }
        //return Vector3.mul(new Vector3(hit.normal.x + 1.0, hit.normal.y + 1.0, hit.normal.z + 1.0), 0.5);
    }
    else {
        const unitDirection = Vector3.normalize(ray.direction);
        const t = (unitDirection.y + 1.0) * 0.5;
        return Vector3.lerp(new Vector3(1.0, 1.0, 1.0), new Vector3(0.5, 0.7, 1.0), t);
    }
}

function pathtracingSetup () {
    const canvas = document.querySelector("#_canvas-pathtracing_");
    const context = canvas.getContext("2d");
    return {
        canvas: canvas,
        context: context,
        samples: 0,
    };
}

function pathtracingDrawScene (pathtracing, resized) {
    if (resized) {
        pathtracing.context.clearRect(0, 0, pathtracing.canvas.width, pathtracing.canvas.height);
        global.pathtracing.samples = 0;
    }

    if (global.pathtracing.samples >= MAX_SAMPLES) {
        return;
    }

    const startTime = performance.now();

    const imageData = pathtracing.context.getImageData(0, 0, pathtracing.canvas.width, pathtracing.canvas.height);

    const aspect = pathtracing.canvas.width / pathtracing.canvas.height;
    const viewSize = 2.0;

    //const camera = new PathtracingCamera (new Vector3(-2.0, -2.0, 1.0), new Vector3(0.0, 0.0, 0.0), new Vector3(0.0, 1.0, 0.0), 90.0, aspect);
    //const camera = new PathtracingCamera (new Vector3(0.0, 0.0, -3.0), new Vector3(0.0, 0.0, 0.0), new Vector3(0.0, 1.0, 0.0), 90.0, aspect);
    const camera = new PathtracingCamera (new Vector3(2.0, 2.0, -3.0), new Vector3(0.0, 0.5, 0.0), new Vector3(0.0, 1.0, 0.0), 60.0, aspect);

    const sphereA = new Sphere(new Vector3(-1.0, 0.5, 0.0), 0.5);
    const sphereB = new Sphere(new Vector3(0.0, 0.5, 0.0), 0.5);
    const sphereC = new Sphere(new Vector3(1.0, 0.5, 0.0), 0.5);
    const sphereFloor = new Sphere(new Vector3(0.0, -1000.0, 0.0), 1000.0);

    const materialA = new PathtracingMaterialMetal(new Vector3(0.9, 0.1, 0.1), 0.2);
    const materialB = new PathtracingMaterialDiffuse(new Vector3(0.1, 0.9, 0.1));
    const materialC = new PathtracingMaterialGlass(new Vector3(0.5, 0.5, 1.0), 2.5);
    const materialFloor = new PathtracingMaterialDiffuse(new Vector3(0.5, 0.5, 0.5));

    const objectA = new PathtracingObject3D(sphereA, materialA);
    const objectB = new PathtracingObject3D(sphereB, materialB);
    const objectC = new PathtracingObject3D(sphereC, materialC);
    const objectFloor = new PathtracingObject3D(sphereFloor, materialFloor);

    const objects = [
        objectA,
        objectB,
        objectC,
        objectFloor,
    ];

    const widthHalf = pathtracing.canvas.width / 2.0;
    const heightHalf = pathtracing.canvas.height / 2.0;

    const samplesPerStep = 1;

    for (let y = 0; y < pathtracing.canvas.height; y++) {
        for (let x = 0; x < pathtracing.canvas.width; x++) {
            const index = (((pathtracing.canvas.height - (y + 1)) * pathtracing.canvas.width) + x) * 4;

            const colour = new Vector3(
                imageData.data[index + 0] / 255,
                imageData.data[index + 1] / 255,
                imageData.data[index + 2] / 255,
            );

            const sampledColour = new Vector3(0.0, 0.0, 0.0);
            for (let s = 0; s < samplesPerStep; s++) {
                const offsetX = Math.random();
                const offsetY = Math.random();

                const ndcX = ((x + offsetX) / widthHalf) - 1.0;
                const ndcY = ((y + offsetY) / heightHalf) - 1.0;

                const u = (ndcX + 1.0) / 2.0;
                const v = (ndcY + 1.0) / 2.0;

                const ray = camera.getRay(u, v);
                const c = pathtracingSampleScene(objects, ray, 5);
                sampledColour.add(c);
            }
            sampledColour.div(samplesPerStep);
            sampledColour.x = Math.sqrt(sampledColour.x);
            sampledColour.y = Math.sqrt(sampledColour.y);
            sampledColour.z = Math.sqrt(sampledColour.z);

            const newColour = Vector3.lerp(colour, sampledColour, 1 / (global.pathtracing.samples + 1));

            imageData.data[index + 0] = newColour.x * 255;
            imageData.data[index + 1] = newColour.y * 255;
            imageData.data[index + 2] = newColour.z * 255;
            imageData.data[index + 3] = 255;

            /*
            const red = (x / pathtracing.canvas.width) * 255;
            const green = (y / pathtracing.canvas.height) * 255;
            imageData.data[index + 0] = red;
            imageData.data[index + 1] = green;
            imageData.data[index + 2] = 0;
            imageData.data[index + 3] = 255;
            */
        }
    }

    global.pathtracing.samples += 1;

    pathtracing.context.putImageData(imageData, 0, 0);

    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log("Pathtracing time: " + duration + "ms");
}