export interface ImageDataCalculatorResult
{
    min?:number;
    max?:number;
    average?:number;
}


export class ImageDataCalculator
{
    public static calcAverage(data:Float32Array, mask:boolean[]):ImageDataCalculatorResult
    {
        if(data.length !== mask.length) throw new Error("mask size must be equals data size"); 
        
        let count = 0;
        let sum = 0;
        let min = Number.MAX_VALUE;
        let max = Number.MIN_VALUE;
        for(let i=0;i<data.length;i++){
            if(mask[i])
            {
                const val = data[i];
                min = Math.min(min, val);
                max = Math.max(max, val);
                sum += val;
                count++;
            }
        }

        return {min:min, max:max, average: sum / count};
    }
}