import { unzipSync } from 'fflate';
import { MaskCanvas } from './MaskCanvas';
import { PFMData, PFMLoader } from './core/PFMLoader';
import { ImageDataCalculator } from './core/ImageDataCalculator';
import { LumimapLite } from './LumimapLite';


// 
// 1.ローカルファイルを取得(input[type=file])
// 2.サーバーにPOST、PFMファイルを含むZipを取得
// 3.PFMデータを取得
// 4.PFMデータからImgを作成、MarkableCanvasをセットアップ


document.addEventListener('DOMContentLoaded', function() {
    const box = document.querySelector(".paintbox") as HTMLDivElement;
    const canvasContainer = document.querySelector(".lumimaplite") as HTMLDivElement;
    
    const fileInput = document.querySelector("#fileinput") as HTMLInputElement;

    //const paintableCanvas = new MaskCanvas(canvasContainer);
    //const canvasRect = canvas.getBoundingClientRect();
    //paintableCanvas.setCanvasSize(canvasRect.width, canvasRect.height);

    const slider = document.getElementById('lineWidthSlider') as HTMLInputElement;
    const valueLabel = document.getElementById('lineWidthValue') as HTMLLabelElement;
    const chkEraser = document.getElementById("useEraser") as HTMLInputElement; 

    const pResult = document.getElementById("result") as HTMLInputElement; 
    
    const lumimap = new LumimapLite(canvasContainer);
    lumimap.init();

    let pfmData:PFMData;
    let luminanceFile:Blob;
    let luminanceFileURL:string = "";

    function updateLineWidth()
    {
        const value = slider.value;
        //paintableCanvas.setLineWidth(Number(value));
        valueLabel.innerHTML = value;
    }

    function updateEraseMode()
    {
        //paintableCanvas.setEraserMode(chkEraser.checked);
    }

    function savePFM(arrayBuffer:ArrayBuffer, filename = "image.pfm") {
        // ArrayBuffer → Blob
        const blob = new Blob([arrayBuffer], { type: "application/octet-stream" });

        // ダウンロードリンクを生成
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // 掃除
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }
    function saveJpeg(arrayBuffer:ArrayBuffer, filename = "image.jpg") {
        // ArrayBuffer → Blob
        const blob = new Blob([arrayBuffer], { type: "image/jpeg" });

        // ダウンロードリンクを生成
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // 掃除
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }
    function createColorArray(pfmData:PFMData, minLimit:number, maxLimit:number)
    {
        function clamp(value:number, lower:number, upper:number){
            return Math.max(lower, Math.min(upper, value));
        }
        const srcData = pfmData.grayscale!;
        const colorData:Uint8ClampedArray = new Uint8ClampedArray(pfmData.width * pfmData.height * 4);

        const RED = [255, 0, 0, 255]; // overflow
        const VIOLET = [127, 0, 255, 255]; // underflow;
        const TRANSPARENT = [0, 0, 0, 0];
        const FLOAT32_MAX = 3.4028234663852886e+38;
        let rgba;
        let loggedMinLimit = Math.log10(minLimit);
        let loggedMaxLimit = Math.log10(maxLimit);
        let logRange = loggedMaxLimit - loggedMinLimit;

        for(let i=0;i<srcData.length;i++){
            let value = srcData[i];
            if(value === -FLOAT32_MAX)
            {
                rgba = TRANSPARENT;
            }
            else if(value === FLOAT32_MAX)
            {
                rgba = TRANSPARENT;
            }
            else{
                const clamped = clamp(value, minLimit, maxLimit);
                if(value === 0.0) value = 0.000001;
                const ratio = (Math.log10(clamped)-loggedMinLimit)/logRange;
                const t = 1.0 - (ratio * 2.0);
                
                rgba = [
                    clamp(1.5 - Math.abs(2.0 * t + 1.0), 0.15, 0.85) * 255,
                    clamp(1.5 - Math.abs(2.0 * t), 0.15, 0.85) * 255,
                    clamp(1.5 - Math.abs(2.0 * t - 1.0), 0.15, 0.85) * 255,
                    255
                ]
            }

            const index = i*4;
            colorData[index+0] = Math.round(rgba[0]);
            colorData[index+1] = Math.round(rgba[1]);
            colorData[index+2] = Math.round(rgba[2]);
            colorData[index+3] = rgba[3]; // alpha
        }
        return colorData;
    }

    slider.addEventListener('input', updateLineWidth);
    chkEraser.addEventListener("change", updateEraseMode);

    async function fetchPFM(file:File) {
        const url = 'https://ik1-127-70116.vs.sakura.ne.jp/markAnomaly';

        const formData = new FormData();
        formData.append("file", file);

        return await fetch(url, {
            method: "POST",
            //body: JSON.stringify({ file1: file }),
            body: formData
        })
        .then(res=>{
            return res.arrayBuffer();
        })
        .then(buffer=>{
            const zip = unzipSync(new Uint8Array(buffer));
            console.log(Object.entries(zip));
            for (const [name, data] of Object.entries(zip) as [string, Uint8Array][]) {
                console.log(name);
                if(name.includes(".pfm"))
                {
                    savePFM(data, name);
                    return PFMLoader.Load(data);
                }
                //else if(name.includes(".jpg"))
                //{
                //console.log(name);
                //    saveJpeg(data, name);
                //}
                //else if(name.includes("_Luminance.jpg"))
                //{
                //    luminanceFile = new Blob([data], { type: 'image/jpeg' });
                //    if(luminanceFileURL !== "") URL.revokeObjectURL(luminanceFileURL);
                //    luminanceFileURL = URL.createObjectURL(luminanceFile);                
                //    backimage.src = luminanceFileURL;
                //}
                //console.log(name);
            }
            throw new Error('PFM File Not Found');
        })
        .catch(e=>{
            throw new Error('Failed to fetch file');
        });
        
        
    }

    fileInput.addEventListener("change", async ()=>{
        // 呼び出し例（実際のAPI URLに置き換えてください）
        const file = fileInput.files![0];
        if(file){
            await lumimap.loadAsync(file);
            //const pfmData = await fetchPFM(file );
            //const pfmData = PFMLoader.Load(new Uint8Array(await file.arrayBuffer()));
            //const data = createColorArray(pfmData, 0.00001, 10000);
            //paintableCanvas.setImageFromArrayBuffer(data, pfmData.width, pfmData.height)
        }
    });

    const calcButton = document.querySelector("#calc") as HTMLInputElement;
    calcButton.addEventListener("click", ()=>{
        /*
        if(pfmData === null) return;
        const mask = markupCanvas.getMask(pfmData.width, pfmData.height);

        if(pfmData.data instanceof Float32Array){
            const result = ImageDataCalculator.calcAverage(pfmData.data, mask);
            const min = result.min?.toFixed(2);
            const max = result.max?.toFixed(2);
            const average = result.average?.toFixed(2);
            pResult.innerText = "MIN:" + min + " MAX:" + max + " AVERAGE:"+average; 
        }
        */
    });

    const resetButton = document.querySelector("#reset") as HTMLInputElement;
    resetButton.addEventListener("click", ()=>{
        //paintableCanvas.clearCanvas();
    });
    
 });
