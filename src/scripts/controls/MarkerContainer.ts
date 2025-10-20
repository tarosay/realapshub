import { CanvasBase } from "./CanvasBase";
import { Marker } from "./Marker";

export class MarkerContainer
{
    private _container;
    private _markers:Marker[] = [];
    constructor()
    {
        this._container = this.createElement();
    }   

    private createElement()
    {
        const container = document.createElement("div");
        container.classList.add("markercontainer");

        return container;
    }

    add(marker:Marker)
    {
        this._markers.push(marker);
        this._container.appendChild(marker.element);
    }

    remove(marker:Marker){
        const idx = this._markers.indexOf(marker);
        if(idx != -1){
            this._container.removeChild(marker.element);
            this._markers.splice(idx, 1);
        }
    }

    clear()
    {
        this._markers.length = 0;
        this._container.innerHTML = "";
    }

    get element(){return this._container as HTMLElement;}
    get markers(){return this._markers;}
}