// 4x4 矩阵，列主序 Float32Array(16)。够用于 2D 正交 + 平移/缩放/旋转。
export function identity() {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}
/** 正交投影：把像素坐标 (0..w, 0..h) 映射到裁剪空间。y 向下为屏幕习惯。 */
export function ortho(w, h) {
    return new Float32Array([
        2 / w, 0, 0, 0,
        0, -2 / h, 0, 0,
        0, 0, 1, 0,
        -1, 1, 0, 1,
    ]);
}
/** a * b（两个列主序 4x4）。 */
export function multiply(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 4; r++) {
            o[c * 4 + r] = a[0 * 4 + r] * b[c * 4 + 0] + a[1 * 4 + r] * b[c * 4 + 1] + a[2 * 4 + r] * b[c * 4 + 2] + a[3 * 4 + r] * b[c * 4 + 3];
        }
    }
    return o;
}
export function translate(x, y) {
    const m = identity();
    m[12] = x;
    m[13] = y;
    return m;
}
export function scale(sx, sy) {
    const m = identity();
    m[0] = sx;
    m[5] = sy;
    return m;
}
export function rotateZ(rad) {
    const c = Math.cos(rad), s = Math.sin(rad);
    const m = identity();
    m[0] = c;
    m[1] = s;
    m[4] = -s;
    m[5] = c;
    return m;
}
//# sourceMappingURL=math.js.map