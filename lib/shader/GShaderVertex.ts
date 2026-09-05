export class GShaderVertex
{
    public static readonly VERTEX =
    `
    attribute vec2 aVertexPosition;
    attribute vec2 aTextureCoord;
    attribute vec2 aColor;
    uniform vec2 projectionVector;
    varying vec2 vTextureCoord;
    varying vec4 vColor;
    const vec2 center = vec2(-1.0, 1.0);

    void main(void) {
        gl_Position = vec4((aVertexPosition / projectionVector) + center, 0.0, 1.0);
        vTextureCoord = aTextureCoord;
        vColor = vec4(aColor.x, aColor.x, aColor.x, aColor.x);
    }
    `;

    public static readonly VERTEX_SWING =
    `
    attribute vec2 aVertexPosition;
    attribute vec2 aTextureCoord;
    attribute vec2 aColor;
    uniform vec2 projectionVector;
    varying vec2 vTextureCoord;
    varying vec4 vColor;
    const vec2 center = vec2(-1.0, 1.0);

    uniform float value;
    uniform float difference;
    uniform float differenceScale;
    uniform float strength;
    uniform float minStrengthScale;
    uniform float maxStrengthScale;
    uniform float directionFactor;
    uniform float onceTimeFactor;
    uniform float onceWaveFactor;
    uniform float heightScale;

    float getOffsetX(vec2 pos, vec2 uv, float timeFactor) {
        pos = mix(vec2(0.0), pos, differenceScale).xy;
        float differenceFactor = pos.x * pos.y * difference;
        float strengthDiff = pow(maxStrengthScale - minStrengthScale, 2.0);
        float strengthClamp = minStrengthScale + strengthDiff + sin((timeFactor + differenceFactor) / onceTimeFactor) * strengthDiff;
        float strengthFactor = clamp(strengthClamp, minStrengthScale, maxStrengthScale) * strength;
        float heightFactor = max(0.0, 1.0 - uv.y - heightScale);
        float offsetX = (sin((timeFactor + differenceFactor)) + cos((timeFactor + differenceFactor) * onceWaveFactor)) * strengthFactor * heightFactor;
        return offsetX * directionFactor;
    }

    void main(void) {
        gl_Position = vec4((aVertexPosition / projectionVector) + center, 0.0, 1.0);
        vTextureCoord = aTextureCoord;
        vColor = vec4(aColor.x, aColor.x, aColor.x, aColor.x);

        gl_Position.x += getOffsetX(gl_Position.xy, vTextureCoord, value);
    }
    `;
}