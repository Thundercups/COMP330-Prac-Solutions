"use strict";

const VERTEX_SHADER_SOURCE = `
    attribute vec3 a_position;
    attribute vec2 a_uv;

    uniform mat4 u_object;
    uniform mat4 u_camera;
    uniform mat4 u_projection;

    varying vec2 v_uv;

    void main() {
        v_uv = a_uv;
        gl_Position = u_projection * u_camera * u_object * vec4(a_position, 1.0);
    }
`;

const FRAGMENT_SHADER_SOURCE = `
    precision mediump float;

    uniform sampler2D u_texture;

    varying vec2 v_uv;

    void main() {
        gl_FragColor = texture2D(u_texture, v_uv);
    }
`;

const POST_EFFECT_FRAGMENT_SOURCE = `
    precision mediump float;

    uniform sampler2D u_texture;
    uniform vec2 u_dimensions;
    uniform float u_seconds;

    varying vec2 v_uv;

    const float HALF_BLUR_SIZE = 16.0;
    const float SIGMA = HALF_BLUR_SIZE * 0.5;
    const float BLUR_BOOST = 4.0;

    void main() {
        //gl_FragColor = texture2D(u_texture, v_uv);

        // Wavy
        vec2 wavy_uv = vec2(v_uv.x + sin((u_seconds + v_uv.y * 1.0) * 3.0) * 0.1, v_uv.y);

        // Blur
        // Taken from:
        // https://gamedev.stackexchange.com/questions/68771/glsl-blur-shader-algorithm-results-in-a-lumpy-blur
        vec4 blurAccumulation = vec4(0.0);
        vec2 offsetSize = 1.0 / u_dimensions;
        float totalWeight = 0.0;
        for (float x = -HALF_BLUR_SIZE; x < HALF_BLUR_SIZE; x += 1.0) {
            for (float y = -HALF_BLUR_SIZE; y < HALF_BLUR_SIZE; y += 1.0) {
                vec2 offset = vec2(x, y);
                vec2 uv = wavy_uv + (offset * offsetSize);
                float weight = exp(-(x*x + y*y) / (2.0 * SIGMA * SIGMA));
                blurAccumulation += texture2D(u_texture, uv) * weight;
                totalWeight += weight;
            }
        }
        gl_FragColor = (blurAccumulation * BLUR_BOOST / totalWeight) + texture2D(u_texture, wavy_uv);
    }
`;

const RENDER_SCALE = 0.5;

function start () {
    // Setup context
    const canvas = document.getElementById("_canvas_");
    const gl = canvas.getContext("webgl");
    if (gl === null) {
        window.alert("WebGL not supported!");
        return;
    }

    // Setup shader
    const program = Util.createProgram(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
    const positionLocation = gl.getAttribLocation(program, "a_position");
    const uvLocation = gl.getAttribLocation(program, "a_uv");
    const objectLocation = gl.getUniformLocation(program, "u_object");
    const cameraLocation = gl.getUniformLocation(program, "u_camera");
    const projectionLocation = gl.getUniformLocation(program, "u_projection");
    const textureLocation = gl.getUniformLocation(program, "u_texture");

    const postProgram = Util.createProgram(gl, VERTEX_SHADER_SOURCE, POST_EFFECT_FRAGMENT_SOURCE);
    const postPositionLocation = gl.getAttribLocation(postProgram, "a_position");
    const postUvLocation = gl.getAttribLocation(postProgram, "a_uv");
    const postObjectLocation = gl.getUniformLocation(postProgram, "u_object");
    const postCameraLocation = gl.getUniformLocation(postProgram, "u_camera");
    const postProjectionLocation = gl.getUniformLocation(postProgram, "u_projection");
    const postTextureLocation = gl.getUniformLocation(postProgram, "u_texture");
    const postSecondsLocation = gl.getUniformLocation(postProgram, "u_seconds");
    const postDimensionsLocation = gl.getUniformLocation(postProgram, "u_dimensions");

    // Enable attributes
    gl.enableVertexAttribArray(positionLocation);
    gl.enableVertexAttribArray(uvLocation);

    // Setup positions
    const positions = new Float32Array([
        -1.0, -1.0, 0.0,
        1.0, -1.0, 0.0,
        -1.0, 1.0, 0.0,

        -1.0, 1.0, 0.0,
        1.0, -1.0, 0.0,
        1.0, 1.0, 0.0,
    ]);
    const positionsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const uvs = new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,

        0.0, 1.0,
        1.0, 0.0,
        1.0, 1.0,
    ]);
    const uvsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

    // Create necessary textures.
    const pinkTexture = makeSingleColourTexture(gl, [1.0, 0.0, 1.0, 1.0]);

    // Create a texture to render to.
    // Taken from:
    // https://webglfundamentals.org/webgl/lessons/webgl-render-to-texture.html
    Util.resizeCanvas(canvas, RENDER_SCALE);
    const targetTextureWidth = canvas.width;
    const targetTextureHeight = canvas.height;
    const targetTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, targetTexture);
    {
        // Define size and format of level 0.
        const level = 0;
        const internalFormat = gl.RGBA;
        const border = 0;
        const format = gl.RGBA;
        const type = gl.UNSIGNED_BYTE;
        const data = null;
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, targetTextureWidth, targetTextureHeight, border, format, type, data);
     
        // Set the filtering so we don't need mips.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    // Create and bind the framebuffer.
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
     
    // Attach the texture as the first color attachment.
    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, 0);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    const projectionMatrix = glMatrix.mat4.create();
    const cameraMatrix = glMatrix.mat4.create();
    const objectMatrix = glMatrix.mat4.create();

    const orthographicSize = 1.2;

    const render = function (seconds) {
        check(isNumber(seconds));

        Util.resizeCanvas(canvas, RENDER_SCALE);

        // Render to texture.
        {
            // Switch what we are rendering to.
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

            gl.viewport(0, 0, targetTextureWidth, targetTextureHeight);
            gl.clear(gl.COLOR_BUFFER_BIT);

            const aspect = targetTextureWidth / targetTextureHeight;

            // Matrix setup.
            glMatrix.mat4.ortho(projectionMatrix, -aspect * orthographicSize, aspect * orthographicSize, -orthographicSize, orthographicSize, -2.0, 2.0);
            glMatrix.mat4.identity(cameraMatrix);
            glMatrix.mat4.identity(objectMatrix);

            // Set shader.
            gl.useProgram(program);

            // Set uniforms.
            gl.uniformMatrix4fv(projectionLocation, false, projectionMatrix);
            gl.uniformMatrix4fv(cameraLocation, false, cameraMatrix);
            gl.uniformMatrix4fv(objectLocation, false, objectMatrix);

            // Buffers
            gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuffer);
            gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, uvsBuffer);
            gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);

            // Texture
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, pinkTexture);
            gl.uniform1i(textureLocation, 0);

            gl.drawArrays(gl.LINE_LOOP, 0, 6);
        }

        // Use the resulting texture for fancy effects!
        {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT);

            const aspect = canvas.width / canvas.height;

            // Matrix setup.
            glMatrix.mat4.identity(projectionMatrix);
            glMatrix.mat4.identity(cameraMatrix);
            glMatrix.mat4.identity(objectMatrix);

            // Set shader.
            gl.useProgram(postProgram);

            // Set uniforms.
            gl.uniformMatrix4fv(postProjectionLocation, false, projectionMatrix);
            gl.uniformMatrix4fv(postCameraLocation, false, cameraMatrix);
            gl.uniformMatrix4fv(postObjectLocation, false, objectMatrix);
            gl.uniform1f(postSecondsLocation, seconds);
            gl.uniform2f(postDimensionsLocation, canvas.width, canvas.height);

            // Buffers
            gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuffer);
            gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, uvsBuffer);
            gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);

            // Texture
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, targetTexture);
            gl.uniform1i(postTextureLocation, 0);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
    };

    const animate = function (milliseconds) {
        window.requestAnimationFrame(animate);

        const seconds = milliseconds / 1000;
        render(seconds);
    };

    animate();
}

function getTexture (gl, id) {
    check(isContext(gl), isString(id));

    const image = document.getElementById(id);
    if (image === null) {
        console.error(`Couldn't find an element on the page with id '${id}'. Are you sure you've attached it to the page?`);
        return null;
    }

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

    image.addEventListener("load", function() {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    });

    return texture;
}

function makeSingleColourTexture (gl, colour) {
    check(isContext(gl), isArray(colour), colour.length === 4);

    colour[0] *= 255;
    colour[1] *= 255;
    colour[2] *= 255;
    colour[3] *= 255;

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Fill the texture with a single pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(colour));

    return texture;   
}
