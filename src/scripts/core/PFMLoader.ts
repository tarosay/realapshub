export interface PFMData
{
    format: 'PF' | 'Pf',
    scaleFactor: string,
    width:number,
    height:number,
    grayscale?:Float32Array,
    rgb?:[Float32Array, Float32Array,Float32Array]
}

// PFM format
// 3行のテキストヘッダ、それ以降はバイナリ
// lines
// 1: identifier    "PF"または"Pf"
// 2: width height  データの幅と高さ、スペース区切り
// 3: -1.0          符号をもつ値。符号はエンディアンを表す（-リトルエンディアン、+ビッグエンディアン）、値はスケール係数。


export class PFMLoader
{
    public static Load(bytes:Uint8Array):PFMData // gray | rgb
    {
        const textDecoder = new TextDecoder("ascii");
        let offset = 0;

        function readLine(): string {
            let start = offset;
            while (offset < bytes.length && bytes[offset] !== 0x0A) offset++; // LF
            const line = textDecoder.decode(bytes.slice(start, offset));
            offset++; // skip LF
            return line.trim();
        }

        // 1. ヘッダ "PF" (カラー) または "Pf" (グレースケール)
        const format = readLine();
        const isColor = format === "PF";
        if (!isColor && format !== "Pf") {
            throw new Error("Unsupported PFM format: " + format);
        }

        // 2. サイズ
        const sizeLine = readLine();
        const [widthStr, heightStr] = sizeLine.split(" ");
        const width = parseInt(widthStr, 10);
        const height = parseInt(heightStr, 10);

        if (isNaN(width) || isNaN(height)) {
            throw new Error("Invalid size: " + sizeLine);
        }

        // 3. スケール（符号付き float）
        const scaleLine = readLine();
        const scaleEndianness = parseFloat(scaleLine);
        const scale = Math.abs(scaleEndianness);
        const littleEndian = scaleEndianness < 0;

        // 4. バイナリデータ読み取り
        const numChannels = isColor ? 3 : 1;
        const numPixels = width * height * numChannels;

        //const dataBytes = bytes.slice(offset);
        //const dataView = new DataView(dataBytes.buffer, dataBytes.byteOffset, dataBytes.byteLength);
        const dataView =new DataView(bytes.buffer, bytes.byteOffset + offset, bytes.byteLength - offset);
        const floatData = new Float32Array(numPixels);
        for (let i = 0; i < numPixels; i++) {
            floatData[i] = dataView.getFloat32(i * 4, littleEndian) * scale;
        }

        const pfmData:PFMData = {format:format, scaleFactor:scaleLine, width:width, height:height};
        // 5. 2次元配列（行列）形式に変換 [channel][y * width + x]
        if (isColor) {

            const r = new Float32Array(width * height);
            const g = new Float32Array(width * height);
            const b = new Float32Array(width * height);

            for(let y = 0; y < height; y++){
                const src_y = height - 1 - y;
                for (let x = 0; x < width; x++) {
                    const src_i = src_y * width + x;
                    const dst_i = y * width + x;
                    r[dst_i] = floatData[src_i * 3 + 0];
                    g[dst_i] = floatData[src_i * 3 + 1];
                    b[dst_i] = floatData[src_i * 3 + 2];
                }
            }
            
            pfmData.rgb = [r, g, b];
        } 
        else {
            let values = new Float32Array(width * height);
            for(let y = 0; y < height; y++){
                const src_y = height - 1 - y;
                for (let x = 0; x < width; x++) {
                    const src_i = src_y * width + x;
                    const dst_i = y * width + x;
                    values[dst_i] = floatData[src_i];
                }
            }

            pfmData.grayscale = values;
        }

        return pfmData;
    }
}