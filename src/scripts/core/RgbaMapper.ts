import { Image2d } from "./Image2d";

const RED = [255, 0, 0, 255]; // overflow
const BLUE = [0, 0, 255, 255]; // overflow
const VIOLET = [127, 0, 255, 255]; // underflow;
const YELLOW = [255, 255, 0.0, 255];
const ORANGE = [255, 127, 0.0, 255];
const LIGHTGREEN = [0.0, 255, 0.0, 255];
const LIGHTBLUE = [0, 255, 255, 255];
const WHITESMOKE = [245,245,245,255];
const PERME = [97, 77, 157, 255];
const TRANSPARENT = [0, 0, 0, 0];

const FLOAT32_MAX = 3.4028234663852886e+38;

function clamp(value:number, lower:number, upper:number){
    return Math.max(lower, Math.min(upper, value));
}

export class RgbaMapper
{
    static async FromPicture(file:File)
    {
        const url = URL.createObjectURL(file);
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = url;
        });

        // Canvasに描画
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);

        // RGBA配列を取得
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        URL.revokeObjectURL(url); // メモリ解放
        // return imageData.data; // Uint8ClampedArray [r,g,b,a,r,g,b,a,...]
        return {
            values:imageData.data,
            width:img.width,
            height:img.height
        }
    }
    static LM(imageData:Image2d, pictureImageData:Uint8ClampedArray, min:number, max:number){
        const colorData:Uint8ClampedArray = new Uint8ClampedArray(imageData.values.length * 4);        
        let rgba;
        let loggedMinLimit = Math.log10(min);
        let loggedMaxLimit = Math.log10(max);
        let logRange = loggedMaxLimit - loggedMinLimit;

        for(let i=0;i<imageData.values.length;i++){
            let value = imageData.values[i];
            if(value === -FLOAT32_MAX)
            {
                rgba = TRANSPARENT;
            }
            else if(value === FLOAT32_MAX)
            {
                rgba = TRANSPARENT;
            }
            else{
                const clamped = clamp(value, min, max);
                if(value === 0.0) value = 0.000001;
                const ratio = (Math.log10(clamped)-loggedMinLimit)/logRange;
                const t = 1.0 - (ratio * 2.0);
                
                rgba = [
                    clamp(1.5 - Math.abs(2.0 * t + 1.0), 0.15, 0.85) * 255,
                    clamp(1.5 - Math.abs(2.0 * t), 0.15, 0.85) * 255,
                    clamp(1.5 - Math.abs(2.0 * t - 1.0), 0.15, 0.85) * 255,
                    255
                ]
            }

            const index = i*4;
            colorData[index+0] = Math.round(rgba[0]);
            colorData[index+1] = Math.round(rgba[1]);
            colorData[index+2] = Math.round(rgba[2]);
            colorData[index+3] = rgba[3]; // alpha
        }
        return colorData;
    }
    static LMContrast(imageData:Image2d, baseLuminance:number){

        const colorData:Uint8ClampedArray = new Uint8ClampedArray(imageData.values.length * 4);        
        let rgba;

        for(let i=0;i<imageData.values.length;i++){
            let value = imageData.values[i] / baseLuminance;

            if(value >= 10.0){
                rgba = RED;
            } 
            else if( value >= 3.0){
                rgba = ORANGE;
            }
            else if( value >= 2.0){
                rgba = YELLOW;
            }
            else if( value >= 0.5){
                rgba = WHITESMOKE;
            }
            else if( value >= 0.3333){
                rgba = LIGHTBLUE;
            }
            else if( value >= 0.1){
                rgba = BLUE;
            }
            else{
                rgba = PERME;
            }

            const index = i*4;
            colorData[index+0] = rgba[0];
            colorData[index+1] = rgba[1];
            colorData[index+2] = rgba[2];
            colorData[index+3] = rgba[3]; // alpha
        }
        return colorData;
    }
    static ColorOverflow(imageData:Image2d, pictureRGBAData:Uint8ClampedArray){
        const colorData:Uint8ClampedArray = new Uint8ClampedArray(imageData.values.length * 4);        
        let rgba = TRANSPARENT;

        for(let i=0;i<imageData.values.length;i++){
            let value = imageData.values[i];
            if(value === FLOAT32_MAX)
            {
                rgba = RED;
            }
            else if(value === -FLOAT32_MAX)
            {
                rgba = BLUE;
            }
            else{
                const index = i*4;
                rgba[0] = pictureRGBAData[index+0];
                rgba[1] = pictureRGBAData[index+1];
                rgba[2] = pictureRGBAData[index+2];
                rgba[3] = pictureRGBAData[index+3];
            }

            const index = i*4;
            colorData[index+0] = rgba[0];
            colorData[index+1] = rgba[1];
            colorData[index+2] = rgba[2];
            colorData[index+3] = rgba[3]; // alpha
        }
        return colorData;
    }
}