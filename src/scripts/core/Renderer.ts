
export class Renderer
{
    private _canvas;
    private _ctx;

    constructor(canvas:HTMLCanvasElement)
    {
        this._canvas = canvas;
        this._ctx = canvas.getContext("2d")!;
    }
    
    private getImageData(){return this._ctx.getImageData(0,0, this._canvas.width, this._canvas.height);}
    private setImageData(imageData:ImageData){this._ctx.putImageData(imageData, 0,0);}
    
    render(data:Uint8ClampedArray)
    {
        const imageData = this.getImageData();
        imageData.data.set(data);    
        this.setImageData(imageData);
    }

    clear()
    {
        this._ctx.clearRect(0,0,this._canvas.width, this._canvas.height);
    }
}