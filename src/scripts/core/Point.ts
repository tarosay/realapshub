export class Point
{
    private _x:number;
    private _y:number;
    private _empty = true;
    constructor();
    constructor(x:number, y:number);

    constructor(x=0, y=0)
    {
        this._x = x;
        this._y = y;

        this._empty = false;
    }

    get x() {return this._x;}
    set x(x:number){this._x = x; this._empty = false;}

    get y() {return this._y;}
    set y(y:number){this._y = y; this._empty = false;}
    
    get isEmpty(){return this._empty;}
};