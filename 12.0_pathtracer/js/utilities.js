
"use strict";

const Utilities = function () {
    const utilities = this;

    utilities.initShaderProgram = function (gl, shaderSourcePair) {
        const vertexShader = utilities.loadShader(gl, gl.VERTEX_SHADER, shaderSourcePair.vert);
        const fragmentShader = utilities.loadShader(gl, gl.FRAGMENT_SHADER, shaderSourcePair.frag);

        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            window.alert("Unable to initialize the shader program: " + gl.getProgramInfoLog(shaderProgram));
            return null;
        }

        return shaderProgram;
    };

    utilities.loadShader = function (gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            window.alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    };
};
const utilities = new Utilities();
