import { Point } from "../core/Point";
import { Rectangle } from "../core/Rectangle";
import { PointerHandler } from "../events/handler";
import { LumimapliteCanvasPaintMode } from "../types/LumimapliteCanvasPaintMode";
import { BackCanvas } from "./BackCanvas";
import { MarkerContainer } from "./MarkerContainer";
import { FrontCanvas } from "./FrontCanvas";
import { Marker } from "./Marker";

const SCALE_MIN = 1.0;
const SCALE_MAX = 20.0;

export class LumimapliteCanvas {
    private _element: HTMLDivElement;

    private _frontCanvas: FrontCanvas;
    private _backCanvas: BackCanvas;
    private _markerContainer: MarkerContainer;

    private _width: number = 0;
    private _height: number = 0;

    private _resizeObserver;
    private _image: ImageBitmap | null = null;
    private _scale = 1.0;
    private _focusPoint = new Point(0.5,0.5);
    private _imageRect:Rectangle = new Rectangle();

    private _mouseDown = false;
    private _downOffsetX = 0;
    private _downOffsetY = 0;
    private _imageRectX = 0;
    private _imageRectY = 0;

    private _pointerDownListeners:PointerHandler[] = [];
    private _clickListeners:PointerHandler[] = [];

    private paintMode: LumimapliteCanvasPaintMode = "brush";

    constructor() {
        this._element = document.createElement("div");
        this._element.classList.add("lumimaplitecanvas");
        this._backCanvas = new BackCanvas();
        this._frontCanvas = new FrontCanvas();
        this._markerContainer = new MarkerContainer();

        this._element.appendChild(this._backCanvas.element);
        this._element.appendChild(this._frontCanvas.element);
        this._element.appendChild(this._markerContainer.element);

        this._resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                if (entry.target == this._element) {
                    const rect = this._element.getBoundingClientRect();
                    this.setSize(rect.width, rect.height);
                }
            }
        });

        this.element.addEventListener("pointerdown", this.onPointerDown);
        this.element.addEventListener("wheel", this.onMouseWheel)
    }

    public setSize(width: number, height: number) {
        this._width = width;
        this._height = height;
        this._frontCanvas.setSize(width, height);
        this._backCanvas.setSize(width, height);

        if(this._image){
            this._imageRect = this.getScaledImageRect(this._image, this._scale, this._focusPoint);
        }
    }

    set image(image: ImageBitmap | null) {
        this._image = image;
        if (this._image == null) {
            this._backCanvas.clear();
        }
        else {
            this.redraw();
        }
    }
    get image() { return this._image; }


    public clear() {
        this._backCanvas.clear();
        this._frontCanvas.clear();
        this._markerContainer.clear();

        this.resetPosition();
    }

    private onPointerDown = (e:PointerEvent)=>
    {
        this._element.setPointerCapture(e.pointerId);
        this._mouseDown = true;
        this._downOffsetX = e.offsetX;
        this._downOffsetY = e.offsetY;
        this._imageRectX = this._imageRect.x;
        this._imageRectY = this._imageRect.y;

        this.emitPointerDown(e);

        this.element.addEventListener("pointermove", this.onPointerMove);
        this.element.addEventListener("pointerup", this.onPointerUp);
    }
    private onPointerMove = (e:PointerEvent)=>
    {
        if(!this._mouseDown) return;

        const deltaX = e.offsetX - this._downOffsetX;
        const deltaY = e.offsetY - this._downOffsetY;
        
        this._imageRect.location = new Point(
            this._imageRectX + deltaX,
            this._imageRectY + deltaY);
        this._imageRect.location = this.calibrateImageLocation(this._imageRect);

        this.updateMarkersPosition();

        this.redraw();
    }
    private onPointerUp = (e:PointerEvent)=>
    {
        this._element.releasePointerCapture(e.pointerId);
        if(!this._mouseDown) return;
        this._mouseDown = false;
        this.redraw();

        if(e.offsetX == this._downOffsetX && e.offsetY == this._downOffsetY)
        {
            this.emitClick(e);
        }

        this.element.removeEventListener("pointermove", this.onPointerMove);
        this.element.removeEventListener("pointerup", this.onPointerUp);
    }

    private onMouseWheel = (e:WheelEvent)=>{
        e.preventDefault();
        if(e.deltaY < 0){
            this.scaleAt(this.scale + 0.5, e.offsetX, e.offsetY);
        }
        else
        {
            this.scaleAt(this.scale - 0.5, e.offsetX, e.offsetY);
        }
    }

    get scale(){return this._scale;}
    set scale(scale:number){
        this._scale = Math.max(SCALE_MIN, Math.min(scale, SCALE_MAX));
        this._backCanvas.scale = this._scale;
        this._frontCanvas.scale = this._scale;

        if(this._image != null){
            this._imageRect = this.getScaledImageRect(this._image, this._scale, this._focusPoint);
            this._backCanvas.drawImage(this._image, this._imageRect);
        }
    }

    /** 指定したオフセット位置を中心に拡大縮小を行います。 */
    scaleAt(scale:number, offsetX:number, offsetY:number)
    {
        if(this._image === null) return;

        const rect = this._imageRect;

        // 画像座標外なら何もしない
        if(offsetX < rect.x || rect.right < offsetX) return;
        if(offsetY < rect.y || rect.bottom < offsetY) return;

        scale = Math.max(SCALE_MIN, Math.min(scale, SCALE_MAX))
        
        // 拡大率が最低値よりも低いなら初期値で表示
        if(scale === SCALE_MIN){
            this.resetPosition();
            this.redraw();
            this.updateMarkersPosition();
            return;
        }

        // クライアント位置から現在描画されている画像の比座標を取得
        const pointRatio = {
            x:(offsetX - rect.x) / rect.width,
            y:(offsetY - rect.y) / rect.height
        };

        // スケール後の画像の矩形を取得
        const newRect = this.getScaledImageRect(this._image, scale, this._focusPoint);
        
        // スケール後の画像領域の位置を決定
        newRect.location = new Point(
            offsetX - newRect.width * pointRatio.x,
            offsetY - newRect.height * pointRatio.y);

        newRect.location = this.calibrateImageLocation(newRect);

        this._imageRect = newRect;
        this._scale = scale;
        this.updateFocusPoint();

        this.redraw();
        this.updateMarkersPosition();
    }

    /** 現在の設定値で画像の再描画を行います。 */
    redraw(){
        if(this._image == null) return;
        if(this._imageRect.isEmpty){
            this._imageRect = this.getScaledImageRect(this._image, this._scale, this._focusPoint);
        }
        this._backCanvas.drawImage(this._image, this._imageRect);
    }

    /** クライアント領域に内接する画像範囲を取得します。*/
    getScaledImageRect(image:ImageBitmap, scale:number, eye:Point):Rectangle
    {
        const base = Math.min(this._width / image.width, this._height / image.height);

        const s = base * scale;

        const dw = image.width * s, dh = image.height * s;
        
        const canvasCenter = new Point(this._width / 2, this._height / 2);
        const imageCenter = new Point(dw * eye.x, dh * eye.y);
        const dx = canvasCenter.x - imageCenter.x;
        const dy = canvasCenter.y - imageCenter.y;

        return new Rectangle(dx, dy, dw, dh);
    }

    

    /** 領域がクライアント領域を満たすように補正したXY座標を取得します。 */
    calibrateImageLocation(rect:Rectangle)
    {
        let x = rect.x;
        let y = rect.y;

        if(this._width <= Math.round(rect.width))
        {
            if(0 < rect.x) x = 0;
            else if(rect.right < this._width) x = this._width - rect.width;
        }
        else{
            x = this._width / 2 - rect.width / 2 
        }
        
        if(this._height <= Math.round(rect.height))
        {
            if(0 < rect.y) y = 0;
            else if(rect.bottom < this._height) y = this._height - rect.height;
        }
        else{
            y = this._height / 2 - rect.height / 2 
        }

        return new Point(x, y);
    }

    // クライアントの中心座標にある、画像の座標を取得します。
    getImagePointAtClientCenter(left:number, top:number)
    {
        return new Point(this._width / 2 + left, this._height / 2 + top);
    }

    // クライアントの中心座標にある画像の座標を比率で取得します。
    getFocusPoint(position:Rectangle){
        const center = new Point(this._width / 2 + position.x, this._height / 2 + position.y);
        return new Point(center.x / position.width, center.y / position.height);
    }

    // クライアント座標から画像座標を取得します。
    clientCoordToImageCoord(clientX:number, clientY:number)
    {
        if(this._image === null) return new Point();
        const point = new Point(clientX - this._imageRect.x, clientY - this._imageRect.y);
        const ratio = new Point(point.x / this._imageRect.width, point.y / this._imageRect.height);
        return new Point(
            Math.floor(ratio.x * this._image.width), 
            Math.floor(ratio.y * this._image.height));
    }

    imageCoordToClientCoord(imageCoord:Point)
    {
        if(this._image === null) return new Point();
        const ratio = new Point((imageCoord.x + 0.5) / this._image.width, (imageCoord.y + 0.5) / this._image.height);
        const point = new Point(this._imageRect.width * ratio.x, this._imageRect.height * ratio.y);
        return new Point(
            this._imageRect.x + point.x, 
            this._imageRect.y + point.y);
    }

    /** クライアントの中心座標にある画像座標を更新します。*/
    private updateFocusPoint()
    {
        if(this._image == null) return;

        this._focusPoint = this.getFocusPoint(this._imageRect);

    }

    private updateMarkersPosition()
    {
        for(let i = 0;i<this._markerContainer.markers.length;i++)
        {
            const marker = this._markerContainer.markers[i];
            const clientCoord = this.imageCoordToClientCoord(marker.imageCoord);
            marker.location = clientCoord;
            marker.visible = !(clientCoord.x < 0 || this._width < clientCoord.x || clientCoord.y < 0 || this._height < clientCoord.y);
        }
    }


    /** 画像の描画位置を初期化します。 */
    resetPosition()
    {
        this._scale = 1.0;
        this._focusPoint = new Point(0.5, 0.5);
        if(this._image) this._imageRect = this.getScaledImageRect(this._image, this._scale, this._focusPoint);
    }

    private emitPointerDown(e:PointerEvent){
        if(this._pointerDownListeners.length != 0){
            for(let i=0;i<this._pointerDownListeners.length;i++) this._pointerDownListeners[i](e);
        }
    }
    private emitClick(e:PointerEvent){
        if(this._clickListeners.length != 0){
            for(let i=0;i<this._clickListeners.length;i++) this._clickListeners[i](e);
        }
    }

    pointerDown(handler:PointerHandler)
    {
        this._pointerDownListeners.push(handler);
    }

    click(handler:PointerHandler)
    {
        this._clickListeners.push(handler);
    }

    addMarker(marker:Marker){
        this._markerContainer.add(marker);
    }
    removeMarker(marker:Marker){
        this._markerContainer.remove(marker);
    }

    get markers() {return this._markerContainer.markers;}

    get element() { return this._element as HTMLElement; }
}