"use strict";

// Snippets taken from:
// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API
// https://webglfundamentals.org/
// http://www.realtimerendering.com/raytracing/Ray%20Tracing%20in%20a%20Weekend.pdf

const global = {
    rasterization: {
        gl: null,
        canvas: null,
        buffer: null,
        programInfo: null,
    },
    pathtracing: null,
};

const MAX_SAMPLES = 16;

function start () {
    // Setup
    global.rasterization = rasterizationSetup();
    global.pathtracing = pathtracingSetup();

    // Go!
    animate();
}

function animate () {
    window.requestAnimationFrame(animate);

    const rasterResize = resizeCanvas(global.rasterization.canvas);
    const pathtraceResize = resizeCanvas(global.pathtracing.canvas);

    if (rasterResize || pathtraceResize) {
        // Viewport resized!
    }

    rasterizationDrawScene(global.rasterization);
    pathtracingDrawScene(global.pathtracing, pathtraceResize);
}

function resizeCanvas (canvas) {
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        return true;
    }
    else {
        return false;
    }
}
