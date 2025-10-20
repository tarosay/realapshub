import { ImageTypes } from "../types/ImageTypes";

export function imageTypeToName(type:ImageTypes)
{
    switch(type)
    {
        case "picture": return "元データ";
        case "cof": return "測光色オーバーフロー";
        case "lm": return "輝度";
        case "lmc": return "輝度比";
        default: return "不明";
    }
}

export async function RgbaArrayFromjpgFile(file: File): Promise<Uint8ClampedArray> {
  // File → HTMLImageElement
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });

  // Canvasに描画
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  // RGBA配列を取得
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  URL.revokeObjectURL(url); // メモリ解放
  return imageData.data; // Uint8ClampedArray [r,g,b,a,r,g,b,a,...]
}

export function clamp(value:number, min:number, max:number){
  return Math.max(min, Math.min(max, value));
}