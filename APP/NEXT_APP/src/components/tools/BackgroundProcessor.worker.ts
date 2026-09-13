// The model and its CPU work stay off the UI thread, so progress and cancel remain usable.
let currentId = 0;
const progress = (key: string, current: number, total: number) => {
    self.postMessage({ type: "progress", id: currentId, key, current, total });
};

self.onmessage = async (event: MessageEvent<{ id: number; file: Blob }>) => {
    currentId = event.data.id;
    try {
        const { removeBackground } = await import("@imgly/background-removal");
        // Keep a stable callback: IMG.LY memoizes its initialized configuration.
        const result = await removeBackground(event.data.file, { progress });
        self.postMessage({ type: "result", id: currentId, result });
    } catch (error) {
        self.postMessage({ type: "error", id: currentId, message: error instanceof Error ? error.message : "No se pudo procesar la imagen." });
    }
};

export {};
