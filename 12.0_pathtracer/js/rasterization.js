"use strict";

function rasterizationSetup () {
    const canvas = document.querySelector("#_canvas-rasterization_");
    const gl = canvas.getContext("webgl");

    if (gl === null) {
        window.alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return null;
    }

    const diffuseShaderProgram = utilities.initShaderProgram(gl, SHADER_DIFFUSE);
    const programInfo = {
        program: diffuseShaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(diffuseShaderProgram, "aVertexPosition"),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(diffuseShaderProgram, "uProjectionMatrix"),
            modelViewMatrix: gl.getUniformLocation(diffuseShaderProgram, "uModelViewMatrix"),
            colour: gl.getUniformLocation(diffuseShaderProgram, "uColour"),
        },
    };

    const sphereGeometry = generateSphereGeometry(gl, 16, 32);

    const sphereRed = {
        geometry: sphereGeometry,
        programInfo: programInfo,
        position: new Vector3(-1.0, 0.5, 0.0),
        scale: 0.5,
        colour: [0.8, 0.1, 0.1],
    };
    const sphereGreen = {
        geometry: sphereGeometry,
        programInfo: programInfo,
        position: new Vector3(0.0, 0.5, 0.0),
        scale: 0.5,
        colour: [0.1, 0.8, 0.1],
    };
    const sphereBlue = {
        geometry: sphereGeometry,
        programInfo: programInfo,
        position: new Vector3(1.0, 0.5, 0.0),
        scale: 0.5,
        colour: [0.1, 0.1, 0.8],
    };
    const sphereFloor = {
        geometry: sphereGeometry,
        programInfo: programInfo,
        position: new Vector3(0.0, -1000.0, 0.0),
        scale: 1000.0,
        colour: [0.8, 0.8, 0.8],
    };

    return {
        gl: gl,
        canvas: canvas,
        objects: [sphereRed, sphereGreen, sphereBlue, sphereFloor],
    };
}

function initBuffers (gl) {
    const positions = [
        -1.0,  1.0,
         1.0,  1.0,
        -1.0, -1.0,
         1.0, -1.0,
    ];

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
    };
}

function generateSphereGeometry (gl, stepsLat, stepsLong) {
    console.assert(stepsLat >= 3);
    console.assert(stepsLong >= 3);

    const getPosition = function (azimuth, altitude) {
        const y = Math.sin(altitude);
        const factor = Math.sqrt(1.0 - (y * y));
        const x = Math.cos(azimuth) * factor;
        const z = Math.sin(azimuth) * factor;
        return new Vector3(x, y, z);
    };

    const positions = [];

    const stepAltitude = Math.PI / stepsLat;
    const stepAzimuth = Math.PI * 2.0 / stepsLong;

    const pushPoint = function (point) {
        positions.push(point.x);
        positions.push(point.y);
        positions.push(point.z);
    };

    for (let lat = 0; lat < stepsLat; lat++) {
        const altitude = (stepAltitude * lat) - (Math.PI / 2.0);
        //console.log("Altitude: " + altitude);
        for (let long = 0; long < stepsLong; long++) {
            const azimuth = stepAzimuth * long;
            //console.log("  Azimuth: " + azimuth);
            if (lat === 0) {
                const a = getPosition(azimuth, altitude + stepAltitude);
                const b = getPosition(azimuth + stepAzimuth, altitude + stepAltitude);

                pushPoint(a);
                pushPoint(b);
                pushPoint(new Vector3(0.0, -1.0, 0.0));
            }
            else if (lat === stepsLat - 1) {
                const a = getPosition(azimuth, altitude);
                const b = getPosition(azimuth + stepAzimuth, altitude);

                pushPoint(a);
                pushPoint(new Vector3(0.0, 1.0, 0.0));
                pushPoint(b);
            }
            else {
                const a = getPosition(azimuth, altitude);
                const b = getPosition(azimuth + stepAzimuth, altitude);
                const c = getPosition(azimuth, altitude + stepAltitude);
                const d = getPosition(azimuth + stepAzimuth, altitude + stepAltitude);

                // First triangle
                pushPoint(a);
                pushPoint(c);
                pushPoint(b);

                // Second triangle
                pushPoint(b);
                pushPoint(c);
                pushPoint(d);
            }
        }
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    return {
        buffer: buffer,

        primitive: gl.TRIANGLES,

        startIndex: 0,
        endIndex: positions.length / 3,

        numComponents: 3,
        type: gl.FLOAT,
        normalize: false,
        stride: 0,
        offset: 0,
    };
}

function rasterizationDrawScene (rasterization) {
    // Clear
    rasterization.gl.clearColor(0.8, 0.9, 1.0, 1.0);
    rasterization.gl.clearDepth(1.0);
    rasterization.gl.enable(rasterization.gl.DEPTH_TEST);
    rasterization.gl.depthFunc(rasterization.gl.LEQUAL);
    rasterization.gl.clear(rasterization.gl.COLOR_BUFFER_BIT | rasterization.gl.DEPTH_BUFFER_BIT);

    rasterization.gl.enable(rasterization.gl.CULL_FACE);

    // Camera & viewport
    rasterization.gl.viewport(0, 0, rasterization.gl.canvas.width, rasterization.gl.canvas.height);
    const fieldOfView = 60.0 * Math.PI / 180.0;
    const aspect = rasterization.gl.canvas.clientWidth / rasterization.gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = glMatrix.mat4.create();
    glMatrix.mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    const viewMatrix = glMatrix.mat4.create();
    glMatrix.mat4.rotateX(viewMatrix, viewMatrix, Math.PI * 0.13);
    glMatrix.mat4.rotateY(viewMatrix, viewMatrix, Math.PI * 1.18);
    glMatrix.mat4.translate(viewMatrix, viewMatrix, [-2.0, -2.0, 3.0]);

    for (let i = 0; i < rasterization.objects.length; i++) {
        const object3d = rasterization.objects[i];

        const modelViewMatrix = glMatrix.mat4.create();
        glMatrix.mat4.multiply(modelViewMatrix, viewMatrix, modelViewMatrix);
        glMatrix.mat4.translate(modelViewMatrix, modelViewMatrix, [object3d.position.x, object3d.position.y, object3d.position.z]);
        glMatrix.mat4.scale(modelViewMatrix, modelViewMatrix, [object3d.scale, object3d.scale, object3d.scale]);

        // Geometry
        const geometry = object3d.geometry;
        rasterization.gl.bindBuffer(rasterization.gl.ARRAY_BUFFER, geometry.buffer);
        rasterization.gl.vertexAttribPointer(object3d.programInfo.attribLocations.vertexPosition, geometry.numComponents, geometry.type, geometry.normalize, geometry.stride, geometry.offset);
        rasterization.gl.enableVertexAttribArray(object3d.programInfo.attribLocations.vertexPosition);

        // Shaders & uniforms
        rasterization.gl.useProgram(object3d.programInfo.program);
        rasterization.gl.uniformMatrix4fv(object3d.programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        rasterization.gl.uniformMatrix4fv(object3d.programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
        rasterization.gl.uniform3fv(object3d.programInfo.uniformLocations.colour, object3d.colour);

        rasterization.gl.drawArrays(geometry.primitive, geometry.startIndex, geometry.endIndex);
        //rasterization.gl.drawArrays(rasterization.gl.LINE_STRIP, geometry.startIndex, geometry.endIndex);
    }
}
