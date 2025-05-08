import { SheetOperations } from './sheetOperations';
import { setProgress, generateRamdomId } from '@/_serverfeatures/utils';
import { BatchUpdate } from './type';

export interface ProcessedRow {
    rowIndex: number;
    rowData: any[];
}

export class DataRetrieval {
    private sheetOperations: SheetOperations;
    private processId: string;

    constructor(sheetId: string) {
        this.sheetOperations = new SheetOperations(sheetId);
        this.processId = generateRamdomId();
    }

    async initialize() {
        await this.sheetOperations.initialize();
    }

    async getFilteredRows(statusFilter: string[] = ['Error', 'To-Do']) {
        const rows = await this.sheetOperations.getSheetData();
        if (!rows || rows.length <= 1) {
            setProgress(this.processId, {
                status: 'completed',
                message: 'No data found'
            });
            return [];
        }

        const dataRows = rows.slice(1);
        const filteredRows = dataRows.map((row: any, rowIndex: number) => ({
            rowIndex: rowIndex + 2,
            rowData: row
        })).filter((item: any) => {
            const status = item.rowData[4];
            return statusFilter.includes(status);
        });

        if (filteredRows.length === 0) {
            setProgress(this.processId, {
                status: 'stop',
                message: `No rows found with status ${statusFilter.join(' or ')}`
            });
        } else {
            setProgress(this.processId, {
                status: 'success',
                message: `Found ${filteredRows.length} rows with status ${statusFilter.join(' or ')}`
            });
        }

        return filteredRows;
    }

    async processBatch(
        batch: ProcessedRow[],
        processFunction: (row: ProcessedRow) => Promise<BatchUpdate>,
        batchSize: number = 10,
        batchDelay: number = 5000
    ) {
        const totalBatches = Math.ceil(batch.length / batchSize);
        
        for (let i = 0; i < batch.length; i += batchSize) {
            const currentBatch = batch.slice(i, i + batchSize);
            const batchNumber = Math.floor(i / batchSize) + 1;

            setProgress(this.processId, {
                status: 'processing',
                currentBatch: batchNumber,
                totalBatches,
                message: `Processing batch ${batchNumber} of ${totalBatches}`
            });

            try {
                const updates = await Promise.all(
                    currentBatch.map(row => processFunction(row))
                );

                await this.sheetOperations.updateSheetStatus(updates);
                await this.sheetOperations.updateAsinData(updates);

                setProgress(this.processId, {
                    status: 'success',
                    currentBatch: batchNumber,
                    message: `Batch ${batchNumber} completed successfully`
                });
            } catch (error: any) {
                setProgress(this.processId, {
                    status: 'error',
                    currentBatch: batchNumber,
                    error: error.message,
                    message: `Error in batch ${batchNumber}`
                });
                throw error;
            }

            if (i + batchSize < batch.length) {
                setProgress(this.processId, {
                    status: 'waiting',
                    currentBatch: batchNumber,
                    message: 'Waiting before next batch'
                });
                await new Promise(resolve => setTimeout(resolve, batchDelay));
            }
        }

        setProgress(this.processId, {
            status: 'completed',
            message: 'All batches processed successfully'
        });
    }

    getProcessId() {
        return this.processId;
    }
} 