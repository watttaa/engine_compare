export class GShaderFragment
{
    //lerp = (1.0 - c) * a + c * b;
    //saturate = max(0.0, min(1.0, a));

    public static readonly FRAGMENT =
    `
    precision lowp float;
    varying vec2 vTextureCoord;
    uniform sampler2D uSampler;

    void main(void) {
        vec4 baseColor = texture2D(uSampler, vTextureCoord);
        gl_FragColor = baseColor;
    }
    `;
    
    public static readonly FRAGMENT_DISSOLVE =
    `
    precision lowp float;
    varying vec2 vTextureCoord;
    uniform sampler2D uSampler;
    uniform sampler2D uSamplerNoise;
    uniform float edgeScale;
    uniform float dissolveFactor;

    void main(void) {
        vec4 baseColor = texture2D(uSampler, vTextureCoord);
        vec4 noiseColor = texture2D(uSamplerNoise, vTextureCoord);
        float noiseValue = noiseColor.r; 
        if (noiseValue <= dissolveFactor) {
            discard;
            return;
        }
        vec4 edgeColor = vec4(1.0, 0.93, 0.68, 0.0);
        float edgeFactor = (noiseValue - dissolveFactor) / (edgeScale * dissolveFactor);
        edgeFactor = 1.0 - max(0.0, min(1.0, edgeFactor));
        vec4 blendColor = baseColor * edgeColor;
        gl_FragColor = (1.0 - edgeFactor) * baseColor + edgeFactor * blendColor;
    }
    `;

    public static readonly FRAGMENT_DISSOLVE_REVERSE =
    `
    precision lowp float;
    varying vec2 vTextureCoord;
    uniform sampler2D uSampler;
    uniform sampler2D uSamplerNoise;
    uniform float edgeScale;
    uniform float dissolveFactor;

    void main(void) {
        vec4 baseColor = texture2D(uSampler, vTextureCoord);
        vec4 noiseColor = texture2D(uSamplerNoise, vTextureCoord);
        float noiseValue = noiseColor.r; 
        if (noiseValue <= dissolveFactor) {
            vec4 edgeColor = vec4(1.0, 0.93, 0.68, 0.0);
            float edgeFactor = (dissolveFactor - noiseValue) / (edgeScale * noiseValue);
            edgeFactor = 1.0 - max(0.0, min(1.0, edgeFactor));
            vec4 blendColor = baseColor * edgeColor;
            gl_FragColor = (1.0 - edgeFactor) * baseColor + edgeFactor * blendColor;
        }
    }
    `;

    public static readonly FRAGMENT_BLUR =
    `
    precision mediump float;
    uniform float blurV;
    uniform sampler2D uSampler;
    varying vec2 vTextureCoord;
    uniform float blurY;
    uniform float textureW;
    uniform float textureH;
    void main()
    {

        vec2 blur = vec2(blurV, blurV);
        vec2 uTextureSize = vec2(720, 1280);
        const int sampleRadius = 5;
        const int samples = sampleRadius * 2 + 1;
        vec2 blurUv = blur / uTextureSize;
        vec4 color = vec4(0, 0, 0, 0);
        vec2 uv = vec2(0.0, 0.0);
        blurUv /= float(sampleRadius);

        for (int i = -sampleRadius; i <= sampleRadius; i++) {
            uv.x = vTextureCoord.x + float(i) * blurUv.x;
            uv.y = vTextureCoord.y + float(i) * blurUv.y;
            color += texture2D(uSampler, uv);
        }

        color /= float(samples);
        if (vTextureCoord.y > blurY) {
            gl_FragColor = color;
        } else {
            gl_FragColor = texture2D(uSampler, vTextureCoord);
        }
    }
    `;

    public static readonly FRAGMENT_MOTION_BLUR =
    `
    precision lowp float;
    varying vec2 vTextureCoord;
    uniform sampler2D uSampler;
    uniform sampler2D uPreviousSampler;
    uniform bool usePrevious;
    uniform float motionFactor;
    uniform float occlusionFactor;
    uniform float blurFactor;
    uniform float blendFactor;

    float colorDifference(vec4 color1, vec4 color2) {
        return abs(color1.r - color2.r) +
               abs(color1.g - color2.g) +
               abs(color1.b - color2.b);
    }

    float colorValue(vec4 color) {
        return abs(color.r) +
               abs(color.g) +
               abs(color.b);
    }

    void main(void) {
        // 采样当前帧的颜色
        vec4 currentColor = texture2D(uSampler, vTextureCoord);

        // 如果当前还从未传递过上一帧的颜色，则直接显示当前帧的颜色
        if (!usePrevious) {
            gl_FragColor = currentColor;
            return;
        }

        // 如果当前帧的颜色值大于遮挡因子时，代表主身应该遮挡住幻影，则直接显示当前帧的颜色
        if (colorValue(currentColor) > occlusionFactor) {
            gl_FragColor = currentColor;
            return;
        }

        // 采样上一帧的颜色
        vec4 previousColor = texture2D(uPreviousSampler, vTextureCoord);
        // 计算当前帧和上一帧之间的颜色差异
        float differenceColor = colorDifference(currentColor, previousColor);
        // 如果颜色差异小于运动因子时，代表运动幅度过小，则直接显示当前帧的颜色
        if (differenceColor < motionFactor) {
            gl_FragColor = currentColor;
            return;
        }

        // 如果上面的条件都不满足，则开始执行运动模糊效果
        vec4 blurColor = vec4(0.0);
        float samplingTimes = 0.0;
        // 约定的模糊采样偏移值
        float blurOffset = 0.001;
        // 进行多次采样并混合
        for (float x = -2.0; x <= 2.0; x += 2.0) {
            for (float y = -2.0; y <= 2.0; y += 2.0) {
                vec2 offsetCoord = vTextureCoord + vec2(x, y) * blurOffset * blurFactor;
                blurColor += texture2D(uPreviousSampler, offsetCoord);
                samplingTimes += 1.0;
            }
        }
        // 将多次采样的模糊颜色进行归一化处理
        blurColor /= samplingTimes;
        // 混合模糊后的颜色和当前帧的颜色
        gl_FragColor = mix(blurColor, currentColor, blendFactor);
    }
    `;

    public static readonly FRAGMENT_MC_MOTION_BLUR =
    `
    precision lowp float;
    varying vec2 vTextureCoord;
    uniform sampler2D uSampler;
    uniform sampler2D uPreviousSampler;
    uniform bool usePrevious;
    uniform float motionFactor;
    uniform float occlusionFactor;
    uniform float blurFactor;
    uniform float blendFactor;

    float colorDifference(vec4 color1, vec4 color2) {
        return abs(color1.r - color2.r) +
               abs(color1.g - color2.g) +
               abs(color1.b - color2.b);
    }

    float colorValue(vec4 color) {
        return abs(color.r) +
               abs(color.g) +
               abs(color.b);
    }

    void main(void) {
        // 采样当前帧的颜色
        vec4 currentColor = texture2D(uSampler, vTextureCoord);

        // 如果当前还从未传递过上一帧的颜色，则直接显示当前帧的颜色
        if (!usePrevious) {
            gl_FragColor = currentColor;
            return;
        }

        // 如果当前帧的颜色值大于遮挡因子时，代表主身应该遮挡住幻影，则直接显示当前帧的颜色
        if (colorValue(currentColor) > occlusionFactor) {
            gl_FragColor = currentColor;
            return;
        }

        // 采样上一帧的颜色
        vec4 previousColor = texture2D(uPreviousSampler, vTextureCoord);
        // 计算当前帧和上一帧之间的颜色差异
        float differenceColor = colorDifference(currentColor, previousColor);
        // 如果颜色差异小于运动因子时，代表运动幅度过小，则直接显示当前帧的颜色
        if (differenceColor < motionFactor) {
            gl_FragColor = currentColor;
            return;
        }

        // 如果上面的条件都不满足，则开始执行运动模糊效果
        vec4 blurColor = vec4(0.0);
        float samplingTimes = 0.0;
        // 约定的模糊采样偏移值
        float blurOffset = 0.1;
        // 进行多次采样并混合
        for (float x = -2.0; x <= 2.0; x += 2.0) {
            for (float y = -2.0; y <= 2.0; y += 2.0) {
                vec2 offsetCoord = vTextureCoord + vec2(x, y) * blurOffset * blurFactor;
                blurColor += texture2D(uPreviousSampler, offsetCoord);
                samplingTimes += 1.0;
            }
        }
        // 将多次采样的模糊颜色进行归一化处理
        blurColor /= samplingTimes;
        // 混合模糊后的颜色和当前帧的颜色
        gl_FragColor = mix(blurColor, currentColor, blendFactor);
    }
    `;
}