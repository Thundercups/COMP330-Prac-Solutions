"use strict";

const vertexShaderSource = `
attribute vec4 a_position;
attribute vec3 a_normal;
attribute vec2 a_uv;

uniform mat4 u_worldMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform mat3 u_normalMatrix;

varying vec3 v_worldPos;
varying vec2 v_texcoord;
varying vec3 v_normal;

void main() {
    v_normal = u_normalMatrix * a_normal;
    v_texcoord = a_uv;
    v_worldPos = (u_worldMatrix * a_position).xyz;
    gl_Position = u_projectionMatrix * u_viewMatrix * u_worldMatrix * a_position;
}
`;

const fragmentShaderSource = `
precision mediump float;

varying vec3 v_worldPos;
varying vec2 v_texcoord;
varying vec3 v_normal;

uniform sampler2D u_diffuse;

const vec3 LIGHT_DIRECTION = normalize(vec3(0.5, 1.0, 0.1));
const vec3 AMBIENT_COLOUR = vec3(0.2, 0.2, 0.2);

void main() {
    vec3 normal = normalize(v_normal);

    float diffuseCo = max(dot(normal, LIGHT_DIRECTION), 0.0);
    vec3 diffuseTexture = texture2D(u_diffuse, v_texcoord).rgb;
    vec3 heightTint = mix(vec3(0.4, 0.2, 0.4), vec3(0.0, 1.0, 0.0), v_worldPos.y / 4.0);
    vec3 diffuseColour = diffuseTexture * heightTint;
    vec3 diffuse = diffuseColour * diffuseCo;
    vec3 ambient = diffuseColour * AMBIENT_COLOUR;

    gl_FragColor = vec4(diffuse + ambient, 1); 
}
`;

function createShader(gl, type, source) {
    check(isContext(gl), isString(source));

    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!success) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    check(isContext(gl), isShader(vertexShader, fragmentShader));

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

// Load a texture from a URL or file location

function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const image = new Image();
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                    width, height, border, srcFormat, srcType,
                    pixel);          

    // Loading images is asynchronous. This sets up a callback that is executed
    // when the image has loaded, to turn it into a texture.

    image.onload = function() {                
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                    srcFormat, srcType, image);  
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    };

    image.src = url;      

    return texture;
}


function main() {

    // === Initialisation ===

    // turn on antialiasing
    const contextParameters =  { antialias: true };

    // get the canvas element & gl rendering 
    const canvas = document.getElementById("c");
    const gl = canvas.getContext("webgl", contextParameters);
    if (gl === null) {
        window.alert("WebGL not supported!");
        return;
    }

    // enable depth testing & backface culling
    gl.enable(gl.DEPTH_TEST);
    //gl.enable(gl.CULL_FACE);
    //gl.cullFace(gl.BACK);

    // create GLSL shaders, upload the GLSL source, compile the shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program =  createProgram(gl, vertexShader, fragmentShader);
    gl.useProgram(program);

    // Initialise the shader attributes & uniforms
    let shader = {};
    const nAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < nAttributes; i++) {
        const name = gl.getActiveAttrib(program, i).name;
        shader[name] = gl.getAttribLocation(program, name);
        gl.enableVertexAttribArray(shader[name]);
    }

    const nUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < nUniforms; i++) {
        const name = gl.getActiveUniform(program, i).name;
        shader[name] = gl.getUniformLocation(program, name);
    }

    // Generate cylindrical mesh

    let points = [];
    let uvs = [];
    let normals = [];

    const WIDTH = 10;
    const DEPTH = 10;
    const HEIGHT = 4;

    /*
        o-----o
        | \ a | 
        | b \ |
        o-----o
    */

    for (let x = 0; x < WIDTH; x++) {
        for(let z = 0; z < DEPTH; z++) {
            const height = Math.floor(Math.random() * HEIGHT);

            {
               // Top A
                points.push(x, height, z);
                points.push(x + 1, height, z);
                points.push(x + 1, height, z + 1);
                uvs.push(0, 0);
                uvs.push(1, 0);
                uvs.push(1, 1);
                normals.push(0, 1, 0);
                normals.push(0, 1, 0);
                normals.push(0, 1, 0);

                // Top B
                points.push(x, height, z);
                points.push(x + 1, height, z + 1);
                points.push(x, height, z + 1);
                uvs.push(0, 0);
                uvs.push(1, 1);
                uvs.push(0, 1);
                normals.push(0, 1, 0);
                normals.push(0, 1, 0);
                normals.push(0, 1, 0);
            }

            {
                // Right A
                points.push(x + 1, height, z);
                points.push(x + 1, 0, z);
                points.push(x + 1, 0, z + 1);
                uvs.push(1, height);
                uvs.push(1, 0);
                uvs.push(0, 0);
                normals.push(1, 0, 0);
                normals.push(1, 0, 0);
                normals.push(1, 0, 0);

                // Right A
                points.push(x + 1, height, z + 1);
                points.push(x + 1, height, z);
                points.push(x + 1, 0, z + 1);
                uvs.push(0, height);
                uvs.push(1, height);
                uvs.push(0, 0);
                normals.push(1, 0, 0);
                normals.push(1, 0, 0);
                normals.push(1, 0, 0);
            }

            {
                // Left A
                points.push(x, height, z);
                points.push(x, 0, z);
                points.push(x, 0, z + 1);
                uvs.push(1, height);
                uvs.push(1, 0);
                uvs.push(0, 0);
                normals.push(-1, 0, 0);
                normals.push(-1, 0, 0);
                normals.push(-1, 0, 0);

                // Left B
                points.push(x, height, z + 1);
                points.push(x, height, z);
                points.push(x, 0, z + 1);
                uvs.push(0, height);
                uvs.push(1, height);
                uvs.push(0, 0);
                normals.push(-1, 0, 0);
                normals.push(-1, 0, 0);
                normals.push(-1, 0, 0);
            }

            {
                // Forward A
                points.push(x, height, z + 1);
                points.push(x, 0, z + 1);
                points.push(x + 1, 0, z + 1);
                uvs.push(1, height);
                uvs.push(1, 0);
                uvs.push(0, 0);
                normals.push(0, 0, 1);
                normals.push(0, 0, 1);
                normals.push(0, 0, 1);

                // Forward B
                points.push(x + 1, height, z + 1);
                points.push(x, height, z + 1);
                points.push(x + 1, 0, z + 1);
                uvs.push(0, height);
                uvs.push(1, height);
                uvs.push(0, 0);
                normals.push(0, 0, 1);
                normals.push(0, 0, 1);
                normals.push(0, 0, 1);
            }

            {
                // Back A
                points.push(x, height, z);
                points.push(x, 0, z);
                points.push(x + 1, 0, z);
                uvs.push(1, height);
                uvs.push(1, 0);
                uvs.push(0, 0);
                normals.push(0, 0, -1);
                normals.push(0, 0, -1);
                normals.push(0, 0, -1);

                // Back B
                points.push(x + 1, height, z);
                points.push(x, height, z);
                points.push(x + 1, 0, z);
                uvs.push(0, height);
                uvs.push(1, height);
                uvs.push(0, 0);
                normals.push(0, 0, -1);
                normals.push(0, 0, -1);
                normals.push(0, 0, -1);
            }
        }
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    const stoneBrickTexture = loadTexture(gl, "textures/stonebrick.png");

    // === Per Frame operations ===

    const cameraRotation = [0,0,0];
    const cameraRotationSpeed = 2 * Math.PI / 10; // radians per second 
    let cameraDistance = 6;
    const cameraZoomSpeed = 1; // distance per second 

    // update objects in the scene
    let update = function(deltaTime) {
        check(isNumber(deltaTime));

        // use the keys to control the camera

        if (inputManager.keyPressed["ArrowLeft"]) {
            cameraRotation[1] -= cameraRotationSpeed * deltaTime;
        }
        if (inputManager.keyPressed["ArrowRight"]) {
            cameraRotation[1] += cameraRotationSpeed * deltaTime;
        }
        if (inputManager.keyPressed["ArrowUp"]) {
            cameraRotation[0] -= cameraRotationSpeed * deltaTime;
        }
        if (inputManager.keyPressed["ArrowDown"]) {
            cameraRotation[0] += cameraRotationSpeed * deltaTime;
        }
        if (inputManager.keyPressed["PageUp"]) {
            cameraDistance -= cameraZoomSpeed * deltaTime;
        }        
        if (inputManager.keyPressed["PageDown"]) {
            cameraDistance += cameraZoomSpeed * deltaTime;
        }

    };

    // allocate matrices
    const projectionMatrix = glMatrix.mat4.create();
    const viewMatrix = glMatrix.mat4.create();
    const worldMatrix = glMatrix.mat4.create();
    const cameraPosition = glMatrix.vec3.create();
    const normalMatrix = glMatrix.mat3.create();

    // redraw the scene
    let render = function() {
        // clear the screen
        gl.viewport(0, 0, canvas.width, canvas.height);        
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        Util.resizeCanvas(canvas);

        // set up the camera projection matrix
        {
            const fovy = Math.PI / 2;
            const aspect = canvas.width / canvas.height;
            const near = 0.01;
            const far = 100;
            glMatrix.mat4.perspective(projectionMatrix, fovy, aspect, near, far);
            gl.uniformMatrix4fv(shader["u_projectionMatrix"], false, projectionMatrix);
        }

        // set up view matrix and camera position
        {
            glMatrix.vec3.set(cameraPosition, 0, 0, cameraDistance);
            glMatrix.vec3.rotateZ(cameraPosition, cameraPosition, [0,0,0], cameraRotation[2]);
            glMatrix.vec3.rotateX(cameraPosition, cameraPosition, [0,0,0], cameraRotation[0]);
            glMatrix.vec3.rotateY(cameraPosition, cameraPosition, [0,0,0], cameraRotation[1]);
            gl.uniform3fv(shader["u_cameraPosition"], cameraPosition);

            const target = [0, 0, 0];
            const up = [0, 1, 0];
            glMatrix.mat4.lookAt(viewMatrix, cameraPosition, target, up);
            gl.uniformMatrix4fv(shader["u_viewMatrix"], false, viewMatrix);
        }

        // set up world matrix
        {            
            glMatrix.mat4.identity(worldMatrix);
            glMatrix.mat4.translate(worldMatrix, worldMatrix, [-WIDTH / 2.0, -HEIGHT / 2.0, -DEPTH / 2.0]);
            gl.uniformMatrix4fv(shader["u_worldMatrix"], false, worldMatrix);

            glMatrix.mat3.normalFromMat4(normalMatrix, worldMatrix);
            gl.uniformMatrix3fv(shader["u_normalMatrix"], false, normalMatrix);
        }

        // draw cylinder
        {
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.vertexAttribPointer(shader["a_position"], 3, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
            gl.vertexAttribPointer(shader["a_uv"], 2, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
            gl.vertexAttribPointer(shader["a_normal"], 3, gl.FLOAT, false, 0, 0);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, stoneBrickTexture);
            gl.uniform1i(shader["u_diffuse"], 0);

            gl.drawArrays(gl.TRIANGLES, 0, points.length / 3);           
        }

    };

    // animation loop
    let oldTime = 0;
    let animate = function(time) {
        check(isNumber(time));
        
        time = time / 1000;
        let deltaTime = time - oldTime;
        oldTime = time;

        update(deltaTime);
        render();

        requestAnimationFrame(animate);
    }

    // start it going
    animate(0);
}    

