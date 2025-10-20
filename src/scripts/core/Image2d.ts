export class Image2d
{
    private _data;
    private _width = 0;
    private _height = 0;

    constructor(data:Float32Array, width:number, height:number)
    {
        if(data.length != width * height) throw new Error("invalid argument. data length must be 'width * height' size.");
        
        this._data = data;
        this._width = width;
        this._height = height;
    }

    getValue(x:number, y:number)
    {
        return this._data[y * this._width + x];
    }

    get values() {return this._data;}

    get width(){return this._width;}
    get height(){return this._height;}
}