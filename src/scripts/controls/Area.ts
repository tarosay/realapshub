import { Point } from "../core/Point";
import { PointerHandler } from "../events/handler";

type MarkerPointerHandler = (sender:Area, e:PointerEvent)=>void;

export class Area
{
    private _element;
    private _tipsElement;
    private _finderElement;
    private _visible = true;
    private _tipsVisible = true;
    private _text = "";
    private _point = new Point();
    private _location = new Point(); // client point
    private _pointerDownLocation = new Point();

    private _clickListeners:MarkerPointerHandler[] = []
    
    constructor(){
        this._element = this.createElement();
        this._tipsElement = this._element.querySelector(".tips") as HTMLElement;
        this._finderElement = this._element.querySelector(".finder") as HTMLElement;
    }

    private createElement()
    {
        const elem = document.createElement("div");
        elem.classList.add("marker");

        const finder = document.createElement("div");
        finder.classList.add("finder");
        finder.addEventListener("pointerdown",this.onFinderPointerDown);

        const tips = document.createElement("div");
        tips.classList.add("tips");

        elem.appendChild(finder);
        elem.appendChild(tips);

        return elem;
    }
    get imageCoord(){return this._point;}
    set imageCoord(point:Point){this._point = point;}
    
    get text(){return this._text;}
    set text(text:string){
        this._text = text;

        this._tipsElement.textContent = text;
    }

    get location(){return this._location;}
    set location(location:Point){
        this._location = location;

        this._element.style.left = location.x + "px";
        this._element.style.top = location.y + "px";
    }

    get visible(){return this._visible;}
    set visible(tf:boolean){
        this._visible=tf;
        this._element.style.display = tf ? "" : "none";
    }

    get tipsVisible(){return this._tipsVisible;}
    set tipsVisible(tf:boolean)
    {
        this._tipsVisible = tf;
        this._tipsElement.style.display = tf ? "" : "none";
    }

    private onFinderPointerDown=(e:PointerEvent)=>{
        this._pointerDownLocation = new Point(e.offsetX, e.offsetY);

        e.stopPropagation();

        this._finderElement.addEventListener("pointermove", this.onFinderPointerMove);
        this._finderElement.addEventListener("pointerup", this.onFinderPointerUp);
    }
    private onFinderPointerMove=(e:PointerEvent)=>{
    
    }
    private onFinderPointerUp=(e:PointerEvent)=>{
        if(this._pointerDownLocation.x == e.offsetX &&
           this._pointerDownLocation.y == e.offsetY){
            this.emitClick(e);
        }

        this._finderElement.removeEventListener("pointermove", this.onFinderPointerMove);
        this._finderElement.removeEventListener("pointerup", this.onFinderPointerUp);
    }

    private emitClick(e:PointerEvent)
    {
        for(let i=0;i<this._clickListeners.length;i++){
            this._clickListeners[i](this, e);
        }
    }
    onClick(handler:MarkerPointerHandler){
        this._clickListeners.push(handler);
    }
    offClick(handler:MarkerPointerHandler){
        const idx = this._clickListeners.indexOf(handler);
        if(idx != - 1) this._clickListeners.splice(idx, 1);
    }

    get element(){return this._element as HTMLElement;}
}