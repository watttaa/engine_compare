// dynamicImport.ts
export function importAll(r: __WebpackModuleApi.RequireContext) {
    /** 
     * by Chatgpt: 
     * 在Webpack中，require.context创建的上下文是在编译时确定的，
     * 因此它并不是全局的。它是相对于调用它的文件的，
     * 并且只会包含其目录及其子目录中匹配的模块。
     * 这意味着在不同的文件中调用require.context将会创建不同的上下文。 
     * 示例:
     * importAll(require.context('./your_directory_path_here', true, /\.ts$|\.js$/));*/
    r.keys().forEach(r);
}