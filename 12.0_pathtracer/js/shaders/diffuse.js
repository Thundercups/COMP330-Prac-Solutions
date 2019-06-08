
"use strict";

const SHADER_DIFFUSE = {
    vert: `
        attribute vec4 aVertexPosition;

        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;

        varying vec3 vlocalPosition;

        void main() {
            vlocalPosition = aVertexPosition.xyz;
            gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        }
    `,
    frag: `
        precision highp float;

        uniform vec3 uColour;

        varying vec3 vlocalPosition;

        void main() {
            float factor = vlocalPosition.y / 2.0 + 0.5;
            gl_FragColor = vec4(uColour * factor, 1.0);
        }
    `,
};
