// 运行时 SDF 图集烘焙。对标 sdf-kit/tools/gen-sdf-atlas.js 的核心算法：
// Canvas2D 光栅字形 → Felzenszwalb & Huttenlocher 精确欧氏距离变换(EDT) → 有符号距离场。
// 无外部资源依赖，纯浏览器 API + JS。
const INF = 1e20;
// —— Felzenszwalb 1D 距离变换（平方距离）——
export function edt1d(f, d, v, z, n) {
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    let k = 0;
    for (let q = 1; q < n; q++) {
        let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        while (s <= z[k]) {
            k--;
            s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        }
        k++;
        v[k] = q;
        z[k] = s;
        z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
        while (z[k + 1] < q)
            k++;
        const dq = q - v[k];
        d[q] = dq * dq + f[v[k]];
    }
}
// —— 2D EDT：先列后行 ——
export function edt2d(grid, w, h) {
    const m = Math.max(w, h);
    const f = new Float64Array(m), d = new Float64Array(m);
    const v = new Int32Array(m), z = new Float64Array(m + 1);
    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++)
            f[y] = grid[y * w + x];
        edt1d(f, d, v, z, h);
        for (let y = 0; y < h; y++)
            grid[y * w + x] = d[y];
    }
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++)
            f[x] = grid[y * w + x];
        edt1d(f, d, v, z, w);
        for (let x = 0; x < w; x++)
            grid[y * w + x] = d[x];
    }
}
// —— 单字形位图(alpha) → 有符号距离场(0..255, 0.5=边缘) ——
export function cellToSDF(rgba, w, h, spread) {
    const inside = new Float64Array(w * h), outside = new Float64Array(w * h);
    for (let i = 0; i < w * h; i++) {
        const a = rgba[i * 4 + 3] / 255;
        if (a > 0.5) {
            inside[i] = 0;
            outside[i] = INF;
        }
        else {
            inside[i] = INF;
            outside[i] = 0;
        }
    }
    edt2d(inside, w, h); // 背景像素到字形的距离²
    edt2d(outside, w, h); // 字形像素到边界的距离²
    const out = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
        const sd = Math.sqrt(outside[i]) - Math.sqrt(inside[i]); // 内部为正
        const val = 0.5 + sd / (2 * spread);
        out[i] = Math.round(Math.max(0, Math.min(1, val)) * 255);
    }
    return out;
}
/**
 * 烘焙 SDF 图集。
 * @param chars 要烘焙的字符数组或字符串
 * @param opts.font    CSS font family
 * @param opts.baseSize 字形光栅像素
 * @param opts.pad     每格 padding = spread（距离场范围）
 * @param opts.cols    图集列数
 */
export function buildSDFAtlas(chars, opts = {}) {
    const font = opts.font || 'sans-serif';
    const baseSize = opts.baseSize || 48;
    const pad = opts.pad || 8;
    const cols = opts.cols || 16;
    const list = Array.isArray(chars) ? chars : Array.from(chars);
    const cell = baseSize + pad * 2;
    const rows = Math.ceil(list.length / cols);
    const aw = cols * cell, ah = rows * cell;
    const gc = document.createElement('canvas');
    gc.width = cell;
    gc.height = cell;
    const gx = gc.getContext('2d', { willReadFrequently: true });
    gx.font = baseSize + 'px ' + font;
    gx.textAlign = 'center';
    gx.textBaseline = 'middle';
    const atlas = new Uint8Array(aw * ah);
    const glyphs = {};
    for (let idx = 0; idx < list.length; idx++) {
        const ch = list[idx];
        gx.clearRect(0, 0, cell, cell);
        gx.fillStyle = '#fff';
        gx.fillText(ch, cell / 2, cell / 2);
        const rgba = gx.getImageData(0, 0, cell, cell).data;
        const sdf = cellToSDF(rgba, cell, cell, pad);
        const col = idx % cols, row = (idx / cols) | 0;
        const ox = col * cell, oy = row * cell;
        for (let y = 0; y < cell; y++) {
            atlas.set(sdf.subarray(y * cell, y * cell + cell), (oy + y) * aw + ox);
        }
        glyphs[ch] = {
            u0: ox / aw, v0: oy / ah, u1: (ox + cell) / aw, v1: (oy + cell) / ah,
            advance: gx.measureText(ch).width / baseSize, // em 单位
        };
    }
    return { atlas, width: aw, height: ah, cell, baseSize, pad, glyphs };
}
/** 把烘焙结果上传为 r8unorm 纹理（处理 256 字节行对齐）。 */
export function uploadSDFTexture(device, res) {
    const { atlas, width, height } = res;
    const bytesPerRow = Math.ceil(width / 256) * 256;
    const padded = new Uint8Array(bytesPerRow * height);
    for (let y = 0; y < height; y++)
        padded.set(atlas.subarray(y * width, y * width + width), y * bytesPerRow);
    const tex = device.createTexture({
        size: [width, height], format: 'r8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    device.queue.writeTexture({ texture: tex }, padded, { bytesPerRow, rowsPerImage: height }, [width, height]);
    return tex;
}
//# sourceMappingURL=sdf.js.map