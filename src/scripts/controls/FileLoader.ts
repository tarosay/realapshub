
export class FileLoader
{
    private _element;

    constructor()
    {
        this._element = this.createElement();
    }    

    createElement()
    {
        const control = document.createElement("div");

        const input = document.createElement("input");
        input.type="file";
        input.accept ="image/jpeg";
        input.hidden = true;

        return control;
    }
}