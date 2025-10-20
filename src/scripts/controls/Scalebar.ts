import { clamp } from "../utilities/ImageNames";

const CANVAS_WIDTH = 80;
const CANVAS_HEIGHT = 120;
const SCALEBAR_WIDTH = 20;

const verticalMargin = 5; // 上下マージン
const PIXEL_OFFSET = 0.5;

export class Scalebar 
{
    private _element;
    private _canvas;
    private _ctx;
    private _min = 0;
    private _max = 0;
    private _visible = true;
    
    constructor(){
        this._element = this.createElement();
        this._canvas = this._element.querySelector(".drawarea") as HTMLCanvasElement;
        this._ctx = this._canvas.getContext("2d")!;
    }

    private createElement(){
        const scalebar = document.createElement("div");
        scalebar.classList.add("scalebar");

        const canvas = document.createElement("canvas");
        canvas.classList.add("drawarea");
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        scalebar.appendChild(canvas);

        return scalebar;
    }

    /** 輝度スケールを描きます */
    drawLmScale(min:number, max:number)
    {
        // キャンバスにスケールバーと目盛りを描く
        const steps = 5;
        const ctx = this._ctx;

        ctx.clearRect(0,0, this._canvas.width, this._canvas.height);

        // スケールバーを描く
        const scalebarWidth = SCALEBAR_WIDTH;
        const scalebarHeight = this._canvas.height - (verticalMargin * 2);
        for(let i=0;i<scalebarHeight;i++)
        {
            const t = 1 - (i / scalebarHeight) * 2;

            const r = Math.floor(clamp(1.5 - Math.abs(2.0 * t + 1.0), 0.15, 0.85) * 255);
		    const g = Math.floor(clamp(1.5 - Math.abs(2.0 * t), 0.15, 0.85) * 255);
		    const b = Math.floor(clamp(1.5 - Math.abs(2.0 * t - 1.0), 0.15, 0.85) * 255);

            ctx.fillStyle = `rgb(${r} ${g} ${b})`;
            ctx.fillRect(0 + PIXEL_OFFSET, verticalMargin + (scalebarHeight - i)+PIXEL_OFFSET, scalebarWidth, 1); // 1pxずつ塗っていく
        }
        // 外枠
        ctx.strokeRect(0+PIXEL_OFFSET, verticalMargin+PIXEL_OFFSET, scalebarWidth, scalebarHeight);

        // 目盛りを描く
        ctx.fillStyle = "black";

        const logMin = Math.log10(min);
        const logMax = Math.log10(max);

        const step = (logMax - logMin) / steps;
        let ticks:number[] = [min];
        for(let i =1;i<steps;i++)
        {
            ticks.push(Math.pow(10, (logMin + step * i)));
        }
        ticks.push(max);

        const interval = scalebarHeight / steps;
        for(let i=0;i<ticks.length;i++){
            const y = (scalebarHeight + verticalMargin) - i * interval + PIXEL_OFFSET;
            const tickWidth = (i == 0 || i == ticks.length - 1 ? 8 : 5);
            ctx.beginPath();
            ctx.moveTo(scalebarWidth, y);
            ctx.lineTo(scalebarWidth + tickWidth, y);
            ctx.stroke();

            //let value = upper - (i*interval);
            //if(isLog) value = Math.pow(10, value);
            const value = ticks[i];
            let fixed = 0;
            if(1 <= value) fixed = 0;
            else {
                fixed = Math.floor(Math.abs(Math.log10(value)));
            }
            
            ctx.fillText(ticks[i].toFixed(fixed), scalebarWidth + 10, y+3);
        }
    }

    drawLmcScale()
    {
        // キャンバスにスケールバーと目盛りを描く
        const ctx = this._ctx;

        ctx.clearRect(0,0, this._canvas.width, this._canvas.height);

        //const points = [0, 1/10, 1/3, 1/2, 2, 3, 10, 20];
        const labels = ["0", "1/10", "1/3", "1/2", "2", "3", "10", "∞"];
        const colors = ["#80f"/*violet*/, "#00f"/*blue*/, "#0ff"/*lightBlue*/, "#f5f5f5"/* whitesmoke*/, "#ff0"/*yellow*/, "#f80"/*orange*/, "#f00"/*red*/];

        const scalebarWidth = SCALEBAR_WIDTH;
        const scalebarHeight = this._canvas.height - (verticalMargin * 2);

        const interval = scalebarHeight / colors.length;
        
        // バーを描く
        for(let i=0;i<colors.length;i++){
            let y = scalebarHeight + verticalMargin - (i * interval);

            ctx.fillStyle = colors[i];
            ctx.fillRect(0+PIXEL_OFFSET, (y - interval) + PIXEL_OFFSET, scalebarWidth, interval + PIXEL_OFFSET);
        }
        
        ctx.fillStyle = "black";
        // 目盛りを描く
        for(let i=0;i<=labels.length;i++){
            let y = scalebarHeight + verticalMargin - (i * interval);

            const tickWidth = i == 0 || i == labels.length-1 ? 8 : 5;
            ctx.beginPath();
            ctx.moveTo(scalebarWidth, y + PIXEL_OFFSET);
            ctx.lineTo(scalebarWidth + tickWidth, y + PIXEL_OFFSET); 
            ctx.stroke();
            ctx.closePath();

            const label = labels[i]; 
            ctx.fillText(label, scalebarWidth + 10, y + 3 + PIXEL_OFFSET);
        }

        // 外枠
        ctx.strokeRect(0+PIXEL_OFFSET, verticalMargin+PIXEL_OFFSET, scalebarWidth, scalebarHeight);
    }
    drawLmcScale2()
    {
        // キャンバスにスケールバーと目盛りを描く
        const steps = 5;
        const ctx = this._ctx;

        ctx.clearRect(0,0, this._canvas.width, this._canvas.height);

        const points = [0.0001, 1/10, 1/3, 1/2, 2, 3, 10, 20];
        const labels = ["0", "1/10", "1/3", "1/2", "2", "3", "10", "∞"];
        const colors = ["#80f"/*violet*/, "#00f"/*blue*/, "#0ff"/*lightBlue*/, "#f5f5f5"/* whitesmoke*/, "#ff0"/*yellow*/, "#f80"/*orange*/, "#f00"/*red*/];

        const scalebarWidth = SCALEBAR_WIDTH;
        const scalebarHeight = this._canvas.height - (verticalMargin * 2);

        ctx.font = ctx.font.replace(/\d+px/, "10px");
        const upper = Math.log10(points[points.length-1]);
        const lower = points[0] === 0 ? -1.2 : Math.log10(points[0]);
        const range = upper - lower;
        const ratio = (scalebarHeight) / range;

        for(let i=0;i<points.length;i++){
            let y = getY(points[i]);
            if(i == 0) y--;
            //else if(i==points.length-1) y++; // 最後だけバーの下に飛び出るのであげる
            const tickWidth = i == 0 || i == points.length-1 ? 8 : 5;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(tickWidth, y); 
            ctx.stroke();

            const label = labels[i]; 
            ctx.fillText(label, scalebarWidth + 10, y + 3);
        }

            function getY(value:number){
                let absY = value === 0 ? 0 : Math.log10(value);
                return Math.round(verticalMargin + (upper - absY) * ratio) + PIXEL_OFFSET;  //  + half pixel offset; これがないと滲む
            }

            //const colorNames = ["#000"/*black*/, "#00f"/*blue*/, "#0ff"/*lightBlue*/, "#0f0"/*green*/, "#ff0"/*yellow*/, "#f00"/*red*/];
            //const colorNames = ["#00f"/*blue*/, "#0ff"/*lightBlue*/, "#0f0"/*green*/, "#f80"/*orange*/, "#ff0"/*yellow*/, "#f00"/*red*/];
            const colorNames = ["#80f"/*violet*/, "#00f"/*blue*/, "#0ff"/*lightBlue*/, "#f5f5f5"/* whitesmoke*/, "#ff0"/*yellow*/, "#f80"/*orange*/, "#f00"/*red*/];
            for(let i=0;i<points.length-1;i++){
                let y = (upper - Math.log10(points[i])) * ratio;
                let nextY = (upper - Math.log10(points[i+1])) * ratio;
                const areaHeight = y - nextY;
                
                ctx.fillStyle = colorNames[i];
                ctx.fillRect(0, nextY, scalebarWidth, areaHeight);
            }

            // 外枠
            ctx.strokeRect(0+PIXEL_OFFSET, verticalMargin+PIXEL_OFFSET, scalebarWidth, scalebarHeight);
        }



    get visible(){return this._visible;}
    set visible(tf:boolean){
        this._visible = tf;
        this._element.style.display = tf ? "" : "none";
    }
    get element(){return this._element as HTMLElement;}
}