import { unzipSync } from 'fflate';
import { Image2d } from "./core/Image2d";
import { Marker } from "./controls/Marker";
import { Scalebar } from "./controls/Scalebar";
import { ImageTypes } from "./types/ImageTypes";
import { ImageSelector } from "./controls/ImageSelector";
import { PFMData, PFMLoader } from './core/PFMLoader';
import { LumimapliteCanvas } from './controls/LumimapliteCanvas';
import { BitmapUtil } from './core/BitmapUtil';
import { Point } from './core/Point';
import { Settings } from './core/Settings';
import { ImageOrder, InitialImageType, Limits } from './constants';


export class LumimapLite
{
    // Settings
    
    // Data
    private _src:File | null = null;
    private _lumiData:Image2d | null = null;
    private _imageDatas:Map<ImageTypes, ImageBitmap> = new Map();
    private _baseLuminance = 0;
    private _settings = new Settings();
    
    // 親コンテナ
    private _container;

    // Controls
    private _scalebar:Scalebar = new Scalebar();
    private _lumimapCanvas:LumimapliteCanvas;
    private _imageSelector:ImageSelector;
    private _resizeObserver;
    
    constructor(container:HTMLDivElement)
    {
        if(container == null) throw new Error("Invalid argument.");
        this._container = container;

        this._scalebar = new Scalebar();
        this._scalebar.visible = false;
        this._imageSelector = new ImageSelector(ImageOrder);
        this._imageSelector.visible = false;
        this._imageSelector.onChanged(this.onImageSelectorChanged);
        this._lumimapCanvas = new LumimapliteCanvas();
        //this._lumimapCanvas.pointerDown(this.onCanvasPointerDown);
        this._lumimapCanvas.click(this.onCanvasClick);

        this._resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                if(entry.target == this._lumimapCanvas.element)
                {
                    this.onControlResized();
                }
            }
        });

    }

    // クラスを初期化します。
    init(){
        this.reset();
        this._container.appendChild(this._lumimapCanvas.element);
        this._container.appendChild(this._imageSelector.element);
        this._container.appendChild(this._scalebar.element);

        this.onControlResized();
    }

    // 画像データをロードします。
    // Jpgファイルを受け取り、サーバからPFMファイルを受け取ってパースします。
    // @param file jpeg or pfm
    async loadAsync(file:File)
    {
        this.reset();

        try
        {
            let pfmData:PFMData;
            if(file.type == "image/x-portable-floatmap" || file.type == "image/x-pfm" || file.name.includes(".pfm")){
                pfmData = PFMLoader.Load(new Uint8Array(await file.arrayBuffer()));
            }
            else if(file.type == "image/jpeg"){
                pfmData = await this.fetchData(file);
            }
            else{
                throw new Error("unsupported file type.");
            }
            
            this._lumiData = new Image2d(pfmData.grayscale!, pfmData.width, pfmData.height);
            await this.initializeImageBitmaps(file, this._lumiData!);

            this.controlVisible = true;

            this.changeImage(InitialImageType);
        }
        catch(ex)
        {
            // error here
            if(ex instanceof Error)
            {
                console.error(ex.message);
            }
            else
            {
                console.error(ex);
            }
            
        }
    }

    private async initializeImageBitmaps(jpg:File, imageF:Image2d)
    {
        const pictureBitmap = await BitmapUtil.createImageBitmap(jpg);
        this._imageDatas.set("picture", pictureBitmap);

        await this.updateLmImageBitmap(imageF, pictureBitmap, this._settings.lm.min, this._settings.lm.max);
        await this.updateLmcImageBitmap(imageF, this._settings.lmc.baseLuminance);
        await this.updateCofImageBitmap(imageF, pictureBitmap);
    }

    // サーバからデータを取得します。
    private async fetchData(jpeg:File)
    {
        const url = 'https://ik1-127-70116.vs.sakura.ne.jp/markAnomaly';
        const formData = new FormData();
        formData.append("file", jpeg);

        return await fetch(url, {
            method: "POST",
            //body: JSON.stringify({ file1: file }),
            body: formData
        })
        .then(response =>{
            if (!response.ok)  throw new Error(`HTTP error! Status: ${response.status}`);
            return response.arrayBuffer();
        })
        .then(buffer => unzipSync(new Uint8Array(buffer)))
        .then(zip =>{
            for (const [name, data] of Object.entries(zip) as [string, Uint8Array][]) {
                if(name.includes(".pfm"))
                {
                    return PFMLoader.Load(data);
                }
            }
            throw new Error('Could not found PFM File');
        })
        .catch(e=>{
            console.log(e);
            throw new Error('Failed to fetch file');
        });
    }

    // コンテントリソースを初期化します。
    reset()
    {
        this._lumimapCanvas.clear();
        this._imageDatas.clear();
        this._settings = new Settings();
        this.controlVisible = false;
    }

    private set controlVisible(tf:boolean)
    {
        this._imageSelector.visible = tf;
        this._scalebar.visible = tf;
    }

    private onControlResized()
    {
        const rect = this._container.getBoundingClientRect();
        this._lumimapCanvas.setSize(rect.width, rect.height);
    }

    private onImageSelectorChanged=(e:Event)=>
    {
        const imageType = this._imageSelector.selectedImageType;
        if(this._imageDatas.has(imageType))
        {
            this.changeImage(imageType);
        }
    }
    private onCanvasPointerDown=(e:PointerEvent)=>
    {
        if(this._lumiData === null) return;
    }
    
    private onCanvasClick=(e:PointerEvent)=>
    {
        if(e.button != 0) return;
        if(this._lumiData === null) return;

        const ic = this._lumimapCanvas.clientCoordToImageCoord(e.offsetX, e.offsetY);
        if(ic.x < 0 || this._lumiData.width < ic.x || ic.y < 0 || this._lumiData.height < ic.y) return;

        const marker = new Marker();
        marker.location = new Point(e.offsetX, e.offsetY);
        marker.imageCoord = ic;
        this.setMarkerTips(marker);
        marker.onClick(this.onMarkerClick);
        this._lumimapCanvas.addMarker(marker);
    }

    private onMarkerClick=(sender:Marker, e:PointerEvent)=>{
        if(e.button != 0) return;
        sender.offClick(this.onMarkerClick);
        this._lumimapCanvas.removeMarker(sender);
    }

    private changeImage(imageType:ImageTypes){
        this._imageSelector.selectedImageType = imageType;
        this._lumimapCanvas.image = this._imageDatas.get(imageType)!;

        switch(imageType)
        {
            case "picture":
            case "cof":
                this._scalebar.visible = false;
                break;
            default:
                this._scalebar.visible = true;
                switch(imageType)
                {
                    case "lm":
                        this._scalebar.drawLmScale(this._settings.lm.min, this._settings.lm.max);
                        break;
                    case "lmc":

                        this._scalebar.drawLmcScale();
                        break;
                    //case "cof":
                    //    this._scalebar.visible = false;
                        break;
                }
            break;
        }

        this.updateAllMarkerTips();
    }

    private updateAllMarkerTips()
    {
        for(let i = 0;i<this._lumimapCanvas.markers.length;i++)
        {
            const marker = this._lumimapCanvas.markers[i];
            this.setMarkerTips(marker);
        }
    }

    private setMarkerTips(marker:Marker)
    {
        switch(this._imageSelector.selectedImageType)
        {
            case "lm":
                this.setLmTips(marker);
                break;
            case "lmc":
                this.setLmcTips(marker);
                break;
            case "cof":
            default:
                this.hideMarkerTips(marker);
                break;   
        }
    }

    private setLmTips(marker:Marker)
    {
        const val = this._lumiData!.getValue(marker.imageCoord.x, marker.imageCoord.y);
        let text = val.toFixed(2);
        if(Limits.FLOAT32_MAX <= val) text = "+overflow";
        else if(val <= -Limits.FLOAT32_MAX) text = "-overflow";
        marker.text = text;
        marker.tipsVisible = true;
    }
    private setLmcTips(marker:Marker)
    {
        const val = this._lumiData!.getValue(marker.imageCoord.x, marker.imageCoord.y);
        let text = (val / this._settings.lmc.baseLuminance).toFixed(2);
        if(Limits.FLOAT32_MAX <= val) text = "+overflow";
        else if(val <= -Limits.FLOAT32_MAX) text = "-overflow";
        marker.text = text;
        marker.tipsVisible = true;
    }
    private hideMarkerTips(marker:Marker)
    {
        marker.tipsVisible = false;
    }

    private async updateLmImageBitmap(imageF:Image2d, pictBitmap:ImageBitmap, min:number, max:number)
    {
        const type:ImageTypes = "lm";
        const lmBitmap = await BitmapUtil.createLMImageBitmap(imageF, min, max);

        // 元絵を合成する
        const bitmap = await BitmapUtil.add(pictBitmap, lmBitmap, lmBitmap.width, lmBitmap.height);

        // 不要になったBitmapをDispose
        const old = this._imageDatas.get(type);
        if(old) old.close();
        lmBitmap.close();

        this._imageDatas.set(type, bitmap);
    }
    private async updateLmcImageBitmap(imageF:Image2d, baseLuminance:number)
    {
        const type:ImageTypes = "lmc";
        const bitmap = await BitmapUtil.createLMContrastImageBitmap(imageF, baseLuminance);

        // 不要になったBitmapをDispose
        const old = this._imageDatas.get(type);
        if(old) old.close();

        this._imageDatas.set(type, bitmap);
    }

    get lmcBaseLuminance(){
        return this._settings.lmc.baseLuminance;
    }

    async setLmcBaseLuminance(baseLuminance:number){
        if(!Number.isFinite(baseLuminance) || baseLuminance <= 0) return;
        this._settings.lmc.baseLuminance = baseLuminance;
        if(this._lumiData){
            await this.updateLmcImageBitmap(this._lumiData, this._settings.lmc.baseLuminance);
            if(this._imageSelector.selectedImageType === "lmc"){
                this.changeImage("lmc");
            }
            else{
                this.updateAllMarkerTips();
            }
        }
    }

    private async updateCofImageBitmap(imageF:Image2d, pictBitmap:ImageBitmap)
    {
        const type:ImageTypes = "cof";
        const cofBitmap = await BitmapUtil.createColorOverflowImageBitmap(imageF);
        
        // 元絵を合成する
        const bitmap = await BitmapUtil.add(pictBitmap, cofBitmap, cofBitmap.width, cofBitmap.height);

        // 不要になったBitmapをDispose
        const old = this._imageDatas.get(type);
        if(old) old.close();

        this._imageDatas.set(type, bitmap);        
    }
}
