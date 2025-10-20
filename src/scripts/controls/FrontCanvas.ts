import { CanvasBase } from "./CanvasBase";

export class FrontCanvas extends CanvasBase
{
    private isDrawing = false;
    private lastX = 0;
    private lastY = 0;
    private isClearMode = false;
    private lineWidth = 4;
    
    private stuckDepth = 10;
    private undoStuck:ImageData[] = [];
    private redoStuck:ImageData[] = [];

    // Canvasサイズと実際の表示サイズの比
    private scaleFactor = {width:1.0, height:1.0};

    constructor()
    {
        super();
        this.element.classList.add("frontcanvas");
        this.initEvents();
    }

    private initEvents() {
        this._canvas.addEventListener('pointerdown', this.startDraw);
        document.addEventListener('pointermove', this.draw);
        document.addEventListener('pointerup', this.endDraw);
        document.addEventListener('pointerleave', this.endDraw);
    }

    private getPos = (e: PointerEvent | TouchEvent): { x: number, y: number } => {
        const rect = this.element.getBoundingClientRect();
        const position = {x:0, y:0};
        if (e instanceof TouchEvent) {
            position.x = e.touches[0].clientX - rect.left;
            position.y = e.touches[0].clientY - rect.top;
        } else {
            position.x = e.clientX - rect.left;
            position.y = e.clientY - rect.top;
        }

        position.x = position.x * this.scaleFactor.width;
        position.y = position.y * this.scaleFactor.height;
        
        return position;
    };

    private startDraw = (e: PointerEvent | TouchEvent) => {
        e.preventDefault();
        this.isDrawing = true;
        this.updateStrokeStyle();
        const pos = this.getPos(e);
        this.lastX = pos.x;
        this.lastY = pos.y;

        this.storeBuffer();
    };

    private draw = (e: PointerEvent | TouchEvent) => {
        if (!this.isDrawing) return;
        const pos = this.getPos(e);
        this._ctx.beginPath();
        this._ctx.moveTo(this.lastX, this.lastY);
        this._ctx.lineTo(pos.x, pos.y);
        this._ctx.stroke();

        this._ctx.beginPath();
        this._ctx.arc(pos.x, pos.y, this._ctx.lineWidth / 2, 0, Math.PI * 2);
        this._ctx.fill();
        this._ctx.beginPath();
        this._ctx.moveTo(pos.x, pos.y);

        this.lastX = pos.x;
        this.lastY = pos.y;
    };

    private endDraw = () => {
        this.isDrawing = false;
    };

    private updateStrokeStyle() {
        this._ctx.lineWidth = this.lineWidth;
        this._ctx.globalCompositeOperation = this.isClearMode ? 'destination-out' : 'source-over';
        this._ctx.strokeStyle = 'white';
        this._ctx.fillStyle = 'white';
    }

    public setLineWidth(width: number) {
        this.lineWidth = width;
        this.updateStrokeStyle();
    }

    public setEraserMode(isEraser: boolean) {
        this.isClearMode = isEraser;
        this.updateStrokeStyle();
    }

    public clearCanvas() {
        this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }

    public getMask(width:number, height:number): boolean[] {
        const mask:boolean[] = new Array(width * height);
        
        const scaledCanvas = document.createElement("canvas");
        scaledCanvas.width = width;
        scaledCanvas.height = height;
        
        const scaledCtx = scaledCanvas.getContext("2d");
        scaledCtx?.drawImage(this._canvas, 0,0, scaledCanvas.width, scaledCanvas.height);
        const data = scaledCtx?.getImageData(0, 0, scaledCanvas.width, scaledCanvas.height).data!;
        
        for (let i = 0; i < mask.length;i++) {
            const idx = i * 4 + 3; // check alpha
            mask[i] = data[idx] > 0;
        }
        return mask;
    }

    public undo()
    {
        if(this.undoStuck.length != 0){
            this.redoStuck.push(this.getImageData());
            this.setImageData(this.undoStuck.pop()!);
        }
    }

    public redo()
    {
        if(this.redoStuck.length != 0)
        {
            this.undoStuck.push(this.getImageData());
            this.setImageData(this.redoStuck.pop()!);
        }
    }

    public reset()
    {
        this.redoStuck = [];
        this.undoStuck = [];
        this.clearCanvas();
    }

    private storeBuffer(){
        this.undoStuck.push(this.getImageData());
        this.redoStuck = [];
    }
}