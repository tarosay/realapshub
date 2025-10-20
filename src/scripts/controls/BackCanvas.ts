import { CanvasBase } from "./CanvasBase";

export class BackCanvas extends CanvasBase
{

    constructor()
    {
        super();
        this.element.classList.add("backcanvas");
    }    
}