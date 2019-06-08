
"use strict";

class Util {
    static resizeCanvas (canvas) {
        check(isCanvas(canvas));

        const cssToRealPixels = window.devicePixelRatio || 1.0;

        const displayWidth = Math.floor(canvas.clientWidth  * cssToRealPixels);
        const displayHeight = Math.floor(canvas.clientHeight * cssToRealPixels);

        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            return true;
        }
        else {
            return false;
        }
    }

    static createProgram (gl, vertex_source, fragment_source) {
        check(isContext(gl), isString(vertex_source, fragment_source));

        const vertShader = UtilPrivate.createShader(gl, gl.VERTEX_SHADER, vertex_source);
        const fragShader = UtilPrivate.createShader(gl, gl.FRAGMENT_SHADER, fragment_source);

        const program = gl.createProgram();
        gl.attachShader(program, vertShader);
        gl.attachShader(program, fragShader);
        gl.linkProgram(program);

        const success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (!success) {
            console.error(gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }

        return program;
    }
}

class UtilPrivate {
    static createShader (gl, type, source) {
        check(isContext(gl), type === gl.VERTEX_SHADER || type === gl.FRAGMENT_SHADER, isString(source));

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
}
