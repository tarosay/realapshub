
export default {
    build: {
        outDir: 'dist', // 出力先を 'build' に変更
        sourcemap: true, // 任意：ソースマップを出力する
        minify: 'esbuild', // 任意：圧縮方法を指定（'terser' や false も可）
    },
};