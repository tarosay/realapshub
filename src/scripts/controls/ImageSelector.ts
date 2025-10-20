import { ImageTypes } from "../types/ImageTypes";
import { imageTypeToName } from "../utilities/ImageNames";

type ChangeHandler = (value: Event) => void;

export class ImageSelector 
{
    private _element;
    private _imageTypes;
    
    private _listeners: ChangeHandler[] = [];

    private _visible = true;

    constructor(imageTypes:ImageTypes[]){
        this._imageTypes = imageTypes;
        this._element = this.createElement(imageTypes);
        
    }

    private createElement(imageTypes:ImageTypes[])
    {
        const select = document.createElement("select");
        select.className = "imageselector"

        for(let i=0;i<imageTypes.length;i++)
        {
            const option = document.createElement("option");
            option.textContent = imageTypeToName(imageTypes[i]);

            select.appendChild(option);
        }

        // attach event
        select.addEventListener("change", (e:Event) => {
            this.emitChanged(e);
        });

        return select;
    }

    onChanged(handler:ChangeHandler)
    {
        this._listeners.push(handler);
    }

    private emitChanged(e: Event) {
        for (const h of this._listeners) h(e);
    }

    get visible(){return this._visible;}
    set visible(tf:boolean){
        this._visible = tf;
        this._element.style.display = tf ? "" : "none";
    }

    get element(){return this._element as HTMLElement;}

    get selectedImageType() { return this._imageTypes[this._element.selectedIndex];}
    set selectedImageType(type:ImageTypes) { this._element.selectedIndex = this._imageTypes.indexOf(type);}
}