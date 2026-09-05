export namespace GShaderConf 
{
    export enum SNoiseUrl
    {
        dissolveNoise1 = 'resource/assets/shader/dissolve_noise_1.png',
    }

    export class SSwing
    {
        directionFactor:number = -1;
        windInterval:number = 0;
        differenceScale:number = 0;
        minStrengthScale:number = 0;
        maxStrengthScale:number = 0;
        onceTimeFactor:number = 0;
        onceWaveFactor:number = 0;
    }
}