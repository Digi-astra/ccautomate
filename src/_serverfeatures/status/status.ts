// this file is under progress do not use this file
class Status {
    private static instance: Status;
    private statusMap: Map<string, string | string[]>;

    private constructor() {
        this.statusMap = new Map();
    }

    public static getInstance(): Status {
        if (!Status.instance) {
            Status.instance = new Status();
        }
        return Status.instance;
    }

    public setStatus(id: string, status: string): void {
        if (this.statusMap.has(id)) {
            const existingStatus = this.statusMap.get(id);
            if (Array.isArray(existingStatus)) {
                existingStatus.push(status);
                this.statusMap.set(id, existingStatus);
            } else {
                this.statusMap.set(id, [existingStatus as string, status]);
            }
        } else {
            this.statusMap.set(id, status);
        }
    }

    public getStatus(id: string): string | string[] | undefined {
        return this.statusMap.get(id);
    }

    public removeStatus(id: string): boolean {
        return this.statusMap.delete(id);
    }

    public clearAllStatus(): void {
        this.statusMap.clear();
    }

    public getAllStatus(): Map<string, string | string[]> {
        return new Map(this.statusMap);
    }

    public hasStatus(id: string): boolean {
        return this.statusMap.has(id);
    }

    public getStatusCount(): number {
        return this.statusMap.size;
    }
}


// Usage example
const statusManager = Status.getInstance();

statusManager.setStatus('123', 'Pending');
statusManager.setStatus('123', 'Processing');

