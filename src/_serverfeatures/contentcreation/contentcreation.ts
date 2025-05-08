import { generateRamdomId, sleep } from "@/_serverfeatures/utils";
import { CONTANTS } from "@/_shared/constant";
import { 
    ContentPayload, 
} from "./type";
const { MAX_RETRIES = "3", RETRY_DELAY = "2000", BATCH_SIZE = "5", BATCH_DELAY = "2000" } = process.env;
import { SheetOperations } from "@/_serverfeatures/common/sheet";
import statusInstance from "@/_serverfeatures/common/status";
import ContentApi from "./contentapi";

class contentcreation extends SheetOperations {
    private MAX_RETRIES: number;
    private RETRY_DELAY: number;
    private BATCH_SIZE: number;
    private BATCH_DELAY: number;
    private currentEnv: 'UAT' | 'PROD';
    private contentType: string;
    private token: string;
    private processId: string;
    private CONTANTS = CONTANTS;
    private status: typeof statusInstance;
    private sleep: (ms: number) => Promise<void>;
    private sheetName: string;
    private contentApi: ContentApi;

    constructor(sheetId: string, currentEnv: 'UAT' | 'PROD', contentType: string, token: string , sheetName: string) {
        super(sheetId);
        this.currentEnv = currentEnv;
        this.contentType = contentType;
        this.token = token;
        this.processId = generateRamdomId();
        this.MAX_RETRIES = parseInt(MAX_RETRIES);
        this.RETRY_DELAY = parseInt(RETRY_DELAY);
        this.BATCH_SIZE = parseInt(BATCH_SIZE);
        this.BATCH_DELAY = parseInt(BATCH_DELAY);
        this.status = statusInstance;
        this.sleep = sleep as (ms: number) => Promise<void>;
        this.sheetName = sheetName || "Input_1";
        this.contentApi = new ContentApi(this.processId, this.currentEnv, this.token, this.contentType);
    }

    async startGeneration() {
        await this.initialize();
        const data = await this.getSheetData(this.sheetName + "!A:ZZ");
        if(!data || data.length === 0){
            this.status.updateData({
                status: "error",
                message: "No data found",
                processId: this.processId
            });
            return;
        }
        const { matchingRows, nonMatchingRows } = this.checkRow(data.slice(1), [{
            index: 21,
            value: true
        }, {
            index: 22,
            value: "To-Do"
        }]);

        if (matchingRows.length === 0) {
            this.status.updateData({
                status: "error", 
                message: "No matching rows found",
                processId: this.processId
            });
            return;
        }

        this.status.updateData({
            status: nonMatchingRows.length > 0 ? "warning" : "processing",
            message: nonMatchingRows.length > 0 
                ? "Some rows are not in the correct format. Processing valid rows."
                : "Processing rows in correct format",
            processId: this.processId
        });
        await this.processBatch(matchingRows);
    }
    
    async processBatch(data: any[]) {
        const totalBatches = Math.ceil(data.length / this.BATCH_SIZE);

        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const startIndex = batchIndex * this.BATCH_SIZE;
            const batch = data.slice(startIndex, startIndex + this.BATCH_SIZE);
            const batchNumber = batchIndex + 1;

            try {
                this.updateBatchStatus("processing", `Processing batch ${batchNumber} of ${totalBatches}`, batchNumber, totalBatches, this.processId);
                // Process batch items in parallel
                await Promise.all(batch.map(async (row: any) => {
                    const {row: rowData, index} = row;
                    const productId = rowData[21];
                    const rowIndex = index + 2;
                    this.updateRowStatus("processing", `Processing row ${rowIndex} and productId ${productId}`, rowIndex, productId, this.processId);
                    const payload = this.generatePayload(rowData, productId);
                    return this.retryOperation(async () => {
                        this.updateRowStatus("pending", `Updating status of row ${rowIndex}`, rowIndex, productId, this.processId);
                        await this.updateStatusRow(rowIndex, "InProgress", "W");
                        this.updateRowStatus("completed", `Status updated for row ${rowIndex}`, rowIndex, productId, this.processId);
                        const contentApiRes = await this.contentApi.generateContent(payload, (processId: string, progress: any) => {
                            this.updateRowStatus(progress.status, progress.message, rowIndex, productId, this.processId);
                        });
                        if(!contentApiRes.error && contentApiRes.data.data.transactionId){
                            let transactionId = contentApiRes.data.data.transactionId;
                            const contentDetails = await this.contentApi.getContentDetails(transactionId, (processId: string, progress: any) => {
                                this.updateRowStatus(progress.status, progress.message, rowIndex, productId, this.processId);
                            });
                            if(!contentDetails.error && contentDetails.data.data.length > 0){
                                const contentUrl = `${this.CONTANTS.UI_URLS[this.currentEnv]}content-editor?id=${contentDetails.data.data[0]._id}&txn=${transactionId}`;
                                await this.updateContent(rowIndex, transactionId, contentUrl);
                                await this.updateStatusRow(rowIndex, "Success", "W");
                                this.updateRowStatus("completed", `Content generated successfully for row ${rowIndex}`, rowIndex, productId, this.processId);
                            }else{
                                this.updateRowStatus("error", contentDetails.error.message, rowIndex, productId, this.processId);
                                await this.updateStatusRow(rowIndex, "Error", "W");
                            }
                        }
                        if(contentApiRes.error){
                            this.updateRowStatus("error", contentApiRes.error.message, rowIndex, productId, this.processId);
                            await this.updateStatusRow(rowIndex, "Error", "W");
                        }
                    });
                }));

                // Add delay between batches if not the last batch
                if (batchNumber < totalBatches) {
                    this.updateBatchStatus("waiting", `Waiting before batch ${batchNumber + 1}`, batchNumber, totalBatches, this.processId);
                    await this.sleep(this.BATCH_DELAY);
                }

            } catch (error: any) {
                this.updateBatchStatus("error", error.message || `Error processing batch ${batchNumber}`, batchNumber, totalBatches, this.processId);
                throw error; // Re-throw to handle at higher level
            }
        }
    }

    getProcessId(){
        return this.processId;
    }
    private generatePayload(row: any , productId: string) {
        const payload: ContentPayload = {
            company_metadata: {
                isCreate: true,
                colorScheme: [],
                brandLogo: "",
                brandLogoFileName: "",
                selectedLanguage: "en",
                brandProductInfo: [
                    {
                        productId: productId,
                        companyAdjective: row[20] ? row[20].split(',').map((adj: string) => adj.trim()) : [],
                        generateAIProducts: row[18] === 'TRUE',
                        generateIngredientMaterial: row[19] === 'TRUE',
                        inpaintingInputImage: "",
                        productImages: row[16] ? row[16].split(',').map((url: string) => url.trim()) : [],
                        uploadedProductImages: []
                    }
                ],
                styleName: row[17] || "RKS 002"
            },
            use_company_metadata: true,
            productIds: [productId],
            contentType: this.contentType
        };

        return payload;
    }
    private  updateBatchStatus(status: string,
        message: string,
        currentBatch: number,
        totalBatches: number,
        processId: string) {
        const statusData = {
            status,
            message,
            currentBatch,
            totalBatches,
            processId
        };
        this.status.updateData(statusData);
    }
    private updateRowStatus(status: string, message: string, currentRow: number, productId: string, processId: string) {
        const statusData = {
            status,
            message,
            currentRow,
            productId,
            processId
        };
        this.status.updateData(statusData);
    }
    private async updateStatusRow(rowIndex: number, status: string, rowType : "E" | "W") {
        const statusRow = this.sheetName + "!" + rowType + rowIndex;
        await this.updateSheetData([{
            range: statusRow,
            values: [[status]]
        }]);
    }
    private async updateContent(rowIndex: number, transactionId: string, contenturl: string){
        let updates = [
            {
                range: this.sheetName + "!" + "X" + rowIndex,
                values: [[transactionId]]
            },
            {
                range: this.sheetName + "!" + "Y" + rowIndex,
                values: [[contenturl]]
            },
            {
                range: this.sheetName + "!" + "Z" + rowIndex,
                values: [[new Date().toISOString()]]
            }
        ]
        await this.updateSheetData(updates);
    }
    private async retryOperation<T>(
        operation: () => Promise<T>,
        maxRetries: number = this.MAX_RETRIES,
        delay: number = this.RETRY_DELAY
    ): Promise<T> {
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;
                // console.warn(`Attempt ${attempt} failed:`, error);
                if (attempt < maxRetries) {
                    await sleep(delay * attempt); // Exponential backoff
                }
            }
        }
        
        throw lastError;
    }
    
}


export default contentcreation;