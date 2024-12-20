type RequestFn = () => Promise<void>;

class AsyncQueueHandler {
    private queue: RequestFn[] = [];
    private processing: boolean = false;
    private resolveEmpty: (() => void)[] = [];

    /**
     * Adds a request to the queue and starts processing.
     * @param requestFn - A function that returns a promise.
     * @returns A promise that resolves when the request is processed.
     */
    enqueue(requestFn: RequestFn): Promise<void> {
        return new Promise((resolve, reject) => {
            this.queue.push(() =>
                requestFn().then(resolve).catch((error) => {
                    console.error("Error processing request:", error);
                    reject(error);
                })
            );
            this.processNext();
        });
    }

    /**
     * Processes the next request in the queue.
     */
    private async processNext(): Promise<void> {
        if (this.processing || this.queue.length === 0) {
            // Resolve the "empty queue" promises if the queue is empty
            if (this.queue.length === 0) {
                this.resolveEmptyPromises();
            }
            return;
        }

        this.processing = true;
        const nextRequest = this.queue.shift();

        try {
            if (nextRequest) {
                await nextRequest();
            }
        } catch (error) {
            console.error("Unexpected error processing request:", error);
            // Additional handling could be done here if necessary
        } finally {
            this.processing = false;
            this.processNext(); // Continue processing the queue
        }
    }

    /**
     * Waits until the queue becomes empty.
     * @returns A promise that resolves when the queue is empty.
     */
    waitUntilEmpty(): Promise<void> {
        if (this.queue.length === 0 && !this.processing) {
            return Promise.resolve(); // Immediately resolve if the queue is empty
        }

        return new Promise((resolve) => {
            this.resolveEmpty.push(resolve);
        });
    }

    /**
     * Resolve any promises waiting for the queue to become empty.
     */
    private resolveEmptyPromises(): void {
        while(this.resolveEmpty.length > 0) {
            const resolve = this.resolveEmpty.shift();
            if (resolve) resolve();
        }
    }
}

export const asyncQueueHandler = new AsyncQueueHandler()