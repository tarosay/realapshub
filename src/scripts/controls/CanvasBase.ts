import { Rectangle } from "../core/Rectangle";

export class CanvasBase
{
    protected _canvas;
    protected _ctx;
    protected _width = 0;
    protected _height = 0;
    private _aspect = 0;
    protected _bitmap:ImageBitmap | null = null;
    protected _scale = 1.0;
    protected _eye = {x:0.5, y:0.5};

    constructor()
    {
        this._canvas = document.createElement("canvas");
        this._ctx = this._canvas.getContext("2d")!;
        this._ctx.imageSmoothingEnabled = false;
    }
    protected getImageData(){return this._ctx.getImageData(0,0, this._canvas.width, this._canvas.height);}
    protected setImageData(imageData:ImageData){this._ctx.putImageData(imageData, 0,0);}


    drawImage(image:ImageBitmap|null, rect:Rectangle)
    {
        this.clear();
        if(image == null) return;

        this._ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
    }

    

    setSize(width:number, height:number)
    {
        this._canvas.width = this._width = width;
        this._canvas.height = this._height = height;

        this._aspect = this._width / this._height;
    }

    get image(){return this._bitmap;}
    set image(bitmap:ImageBitmap|null) {this._bitmap = bitmap;} 

    get scale(){return this._scale;}
    set scale(scale:number){this._scale = Math.max(scale, 1.0);}

    clear()
    {
        this._ctx.clearRect(0,0,this._canvas.width, this._canvas.height);
    }

    get element(){return this._canvas;}
}