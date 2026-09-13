export type BackgroundProgress = (key: string, current: number, total: number) => void;

// Older browsers can still use IMG.LY's regular canvas implementation.
let fallbackQueue: Promise<unknown> = Promise.resolve();
let fallbackProgress: BackgroundProgress | null = null;
const reportFallback: BackgroundProgress = (...values) => fallbackProgress?.(...values);

export class BackgroundProcessor {
    private worker: Worker | null = null;
    private rejectPending: ((error: Error) => void) | null = null;
    private sequence = 0;

    cancel() {
        this.sequence += 1;
        this.worker?.terminate();
        this.worker = null;
        this.rejectPending?.(new DOMException("Proceso cancelado", "AbortError"));
        this.rejectPending = null;
    }

    process(file: Blob, onProgress: BackgroundProgress): Promise<Blob> {
        if (this.rejectPending) this.cancel();
        if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") {
            return this.processCompatible(file, onProgress);
        }
        const id = ++this.sequence;
        let worker: Worker;
        try {
            worker = this.worker ?? new Worker(new URL("./BackgroundProcessor.worker.ts", import.meta.url), { type: "module" });
        } catch {
            return this.processCompatible(file, onProgress);
        }
        this.worker = worker;
        return new Promise<Blob>((resolve, reject) => {
            this.rejectPending = reject;
            worker.onmessage = (event: MessageEvent) => {
                const data = event.data;
                if (data.id !== id || id !== this.sequence) return;
                if (data.type === "progress") onProgress(data.key, data.current, data.total);
                else if (data.type === "result") {
                    this.rejectPending = null;
                    resolve(data.result);
                } else if (data.type === "error") {
                    this.rejectPending = null;
                    this.cancel(); // A failed model initialization is cached by the library; retry in a fresh worker.
                    reject(new Error(data.message));
                }
            };
            worker.onerror = () => {
                this.rejectPending = null;
                this.cancel();
                this.processCompatible(file, onProgress).then(resolve, reject);
            };
            worker.postMessage({ id, file });
        });
    }

    private processCompatible(file: Blob, onProgress: BackgroundProgress): Promise<Blob> {
        const id = ++this.sequence;
        onProgress("compatible", 0, 0);
        const result = fallbackQueue.then(async () => {
            if (id !== this.sequence) throw new DOMException("Proceso cancelado", "AbortError");
            fallbackProgress = (...values) => { if (id === this.sequence) onProgress(...values); };
            try {
                const { removeBackground } = await import("@imgly/background-removal");
                return await removeBackground(file, { progress: reportFallback, output: { format: "image/png", quality: 1 } });
            } finally { fallbackProgress = null; }
        });
        fallbackQueue = result.catch(() => undefined);
        return result;
    }
}
