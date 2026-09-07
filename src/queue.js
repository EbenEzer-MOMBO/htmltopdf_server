/**
 * File d'attente FIFO avec concurrence limitée.
 */
class JobQueue {
    constructor(concurrency = 1) {
        this.concurrency = Math.max(1, concurrency);
        this.running = 0;
        this.pending = [];
    }

    run(fn) {
        return new Promise((resolve, reject) => {
            this.pending.push({ fn, resolve, reject });
            this._drain();
        });
    }

    _drain() {
        while (this.running < this.concurrency && this.pending.length > 0) {
            const { fn, resolve, reject } = this.pending.shift();
            this.running += 1;
            Promise.resolve()
                .then(fn)
                .then(resolve, reject)
                .finally(() => {
                    this.running -= 1;
                    this._drain();
                });
        }
    }

    get size() {
        return this.pending.length + this.running;
    }
}

module.exports = { JobQueue };
