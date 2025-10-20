import { Point } from "./Point";

export class Rectangle
{
    x:number;
    y:number;
    width:number;
    height:number;

    constructor();
    constructor(x:number, y:number, width:number, height:number);
    
    constructor(x:number = 0, y:number =0, width:number=0, height:number=0){
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    get left(){return this.x;}
    get top(){return this.y;}
    get right() {return this.x + this.width;}
    get bottom() {return this.y + this.height;}
    get location(){return new Point(this.x, this.y);}
    set location(point:Point){ 
        this.x = point.x;
        this.y = point.y;
    }
    get isEmpty(){
        return (this.x === 0 && this.y === 0 && this.width === 0 && this.height === 0);
    }
};