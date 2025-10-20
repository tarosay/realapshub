interface Options {
    width: number;
    height: number;
    luminanceData: number[][];
    backgroundImagePath: string
}
export type PaintableCanvasPaintModes = "brush" | "eraser";

// 画像の上に絵を書くためのコントロール
// Image要素と、挿入先要素を受け取って、生成する。

export class MaskCanvas {
    private container:HTMLDivElement;
    private canvasContainer:HTMLDivElement;
    private imgCanvas: HTMLCanvasElement;
    private maskCanvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    private width:number = 0;
    private height:number = 0;

    // Canvasサイズと実際の表示サイズの比
    private scaleFactor = {width:1.0, height:1.0};

    private isDrawing = false;
    private lastX = 0;
    private lastY = 0;
    private isClearMode = false;
    private lineWidth = 4;
    
    private stuckDepth = 10;
    private undoStuck:ImageData[] = [];
    private redoStuck:ImageData[] = [];

    private paintMode:PaintableCanvasPaintModes = "brush";

    constructor(containerElem:HTMLDivElement){
        this.container = containerElem; 
        this.canvasContainer = document.createElement("div");
        this.canvasContainer.classList.add("canvascontainer");
        this.imgCanvas = document.createElement('canvas');
        this.imgCanvas.classList.add("icanvas");
        this.maskCanvas = document.createElement('canvas');
        this.maskCanvas.classList.add("mcanvas");
        this.ctx = this.maskCanvas.getContext('2d')!;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.container.innerHTML = "";
        this.canvasContainer.appendChild(this.imgCanvas);
        this.canvasContainer.appendChild(this.maskCanvas);
        this.container.appendChild(this.canvasContainer);

        this.initEvents();
    }

    public setImageFromArrayBuffer(arrayBuffer:Uint8ClampedArray, width:number, height:number)
    {
        if(arrayBuffer.length != width * height * 4) 
        {
            throw new Error("invalid data size");
        }
        this.setCanvasSize(width, height);
        const ctx = this.imgCanvas.getContext("2d")!;
        const imageData = ctx.getImageData(0,0, width, height);
        imageData.data.set(arrayBuffer);
        ctx.putImageData(imageData, 0, 0);
    }

    public setCanvasSize(width:number, height:number)
    {
        this.imgCanvas.width = this.maskCanvas.width = this.width = width;
        this.imgCanvas.height = this.maskCanvas.height = this.height = height;

        const rect = this.imgCanvas.getBoundingClientRect();
        this.scaleFactor.width = width / rect.width;
        this.scaleFactor.height = height / rect.height;
    }

    private initEvents() {
        this.maskCanvas.addEventListener('pointerdown', this.startDraw);
        document.addEventListener('pointermove', this.draw);
        document.addEventListener('pointerup', this.endDraw);
        document.addEventListener('pointerleave', this.endDraw);
    }

    private getPos = (e: PointerEvent | TouchEvent): { x: number, y: number } => {
        const rect = this.maskCanvas.getBoundingClientRect();
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
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, this.ctx.lineWidth / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y);

        this.lastX = pos.x;
        this.lastY = pos.y;
    };

    private endDraw = () => {
        this.isDrawing = false;
    };

    private updateStrokeStyle() {
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.globalCompositeOperation = this.isClearMode ? 'destination-out' : 'source-over';
        this.ctx.strokeStyle = 'white';
        this.ctx.fillStyle = 'white';
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
        this.ctx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
    }

    public getMask(width:number, height:number): boolean[] {
        const mask:boolean[] = new Array(width * height);
        
        const scaledCanvas = document.createElement("canvas");
        scaledCanvas.width = width;
        scaledCanvas.height = height;
        
        const scaledCtx = scaledCanvas.getContext("2d");
        scaledCtx?.drawImage(this.maskCanvas, 0,0, scaledCanvas.width, scaledCanvas.height);
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
            this.putImageData(this.undoStuck.pop()!);
        }
    }

    public redo()
    {
        if(this.redoStuck.length != 0)
        {
            this.undoStuck.push(this.getImageData());
            this.putImageData(this.redoStuck.pop()!);
        }
    }

    public reset()
    {
        this.redoStuck = [];
        this.undoStuck = [];
        this.clearCanvas();
    }

    public getImageCanvas()
    { 
        return this.imgCanvas;
    }
    private getImageData()
    {
        return this.ctx.getImageData(0,0,this.maskCanvas.width, this.maskCanvas.height);
    }
    private putImageData(imageData:ImageData)
    {
        this.ctx.putImageData(imageData, 0, 0);
    }
    private storeBuffer(){
        this.undoStuck.push(this.getImageData());
        this.redoStuck = [];
    }
}