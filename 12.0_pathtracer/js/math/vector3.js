
"use strict";

class Vector3 {
    constructor (x, y, z) {
        check(isNumber(x, y, z));
        this.x = x;
        this.y = y;
        this.z = z;
    }

    set (x, y, z) {
        check(isNumber(x, y, z));
        this.x = x;
        this.y = y;
        this.z = z;
    }

    clone () {
        return new Vector3(this.x, this.y, this.z);
    }

    squared_length () {
        return (this.x * this.x) + (this.y * this.y) + (this.z * this.z);
    }

    length () {
        return Math.sqrt(this.squared_length());
    }

    static add (a, b) {
        check(isVector3(a, b));
        return new Vector3(a.x + b.x, a.y + b.y, a.z + b.z);
    }

    static sub (a, b) {
        check(isVector3(a, b));
        return new Vector3(a.x - b.x, a.y - b.y, a.z - b.z);
    }

    static mul (v, s) {
        check(isVector3(v), isNumber(s));
        return new Vector3(v.x * s, v.y * s, v.z * s);
    }

    static div (v, s) {
        check(isVector3(v), isNumber(s));
        return new Vector3(v.x / s, v.y / s, v.z / s);
    }

    static negate (v) {
        check(isVector3(v));
        return new Vector3(-v.x, -v.y, -v.z);
    }

    static normalize (v) {
        check(isVector3(v));
        const length = v.length();
        return new Vector3(v.x / length, v.y / length, v.z / length);
    }

    add (v) {
        check(isVector3(v));
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
    }

    sub (v) {
        check(isVector3(v));
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
    }

    mul (s) {
        check(isNumber(s));
        this.x *= s;
        this.y *= s;
        this.z *= s;
    }

    div (s) {
        check(isNumber(s));
        this.x /= s;
        this.y /= s;
        this.z /= s;
    }

    negate () {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
    }

    normalize () {
        const length = this.length();
        this.div(length);
    }

    static dot (a, b) {
        check(isVector3(a, b));
        return (a.x * b.x) + (a.y * b.y) + (a.z * b.z);
    }

    static cross (a, b) {
        check(isVector3(a, b));
        return new Vector3 (
            (a.y * b.z) - (a.z * b.y),
            -((a.x * b.z) - (a.z * b.x)),
            (a.x * b.y) - (a.y * b.x),
        );
    }

    static reflect (v, n) {
        check(isVector3(v, n));
        const dot = Vector3.dot(v, n);
        const subtract = Vector3.mul(n, 2.0 * dot);
        return Vector3.sub(v, subtract);
    }

    static refract (v, n, niOverNt) {
        check(isVector3(v, n), isNumber(niOverNt));
        const unitV = Vector3.normalize(v);
        const dt = Vector3.dot(unitV, n);
        const discriminant = 1.0 - (niOverNt * niOverNt * (1.0 - (dt * dt)));
        if (discriminant > 0.0) {
            return Vector3.sub(Vector3.mul(Vector3.sub(unitV, Vector3.mul(n, dt)), niOverNt), Vector3.mul(n, Math.sqrt(discriminant)));
        }
        else {
            return null;
        }
    }

    static lerp (a, b, t) {
        check(isVector3(a, b), isNumber(t));
        const it = 1.0 - t;
        return new Vector3 (
            (it * a.x) + (t * b.x),
            (it * a.y) + (t * b.y),
            (it * a.z) + (t * b.z),
        );
    }
}
const isVector3 = newCheck(function (v) {
    return v instanceof Vector3;
});
