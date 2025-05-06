import { sleep } from "@/_shared/utils";
import { CONTANTS } from "@/_shared/constant";
import { SheetRow, ProcessStatus } from "@/_serverfeatures/scraping/type";

export async function getProductDetailsFromApi(transactionId: string, currentEnv: 'UAT' | 'PROD', token: string) {
    const getProductUrl = CONTANTS.ENV_URLS[currentEnv] + `api/v1/products/product-by-transaction-id/${transactionId}?limit=50&offset=0`;
    try {
        const response = await fetch(getProductUrl, {
            headers: {
                "accept": "application/json",
                "authorization": `Bearer ${token}`,
                "content-type": "application/json",
            },
            method: "GET"
        });

        if (!response.ok) {
            throw new Error(`Failed to get product details for transactionId ${transactionId}: ${response.statusText}`);
        }

        const result = await response.json();
        return result.data;
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Error fetching product details for transactionId ${transactionId}:`, error.message);
        } else {
            console.error(`Error fetching product details for transactionId ${transactionId}:`, 'Unknown error occurred');
        }
        return null;
    }
}



async function fetchSheetData(sheetsClient: any, sheetId: string) {
    const response = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Input_1!A:ZZ',
    });
    return response.data.values;
}

function processRowData(row: any[]): SheetRow {
    return {
        transactionId: row[5],
        productId: row[21],
        amazonUrl: row[3],
        amazonAsinOg: row[2],
        amazonAsin: row[37]
    };
}

async function processRow(
    rowData: SheetRow,
    rowIndex: number,
    currentEnv: 'UAT' | 'PROD',
    token: string
): Promise<{ range: string; values: string[][] } | null> {
    if (!rowData.transactionId || rowData.productId) {
        return null;
    }

    console.log(`Processing row ${rowIndex + 2}: Found transactionId ${rowData.transactionId}`);
    const productDetails = await getProductDetailsFromApi(rowData.transactionId, currentEnv, token);
    
    console.log("DEBUG compare amazonAsin itm", rowData.amazonAsin);
    const foundProduct = productDetails.data.find((itm: { asin: string }) => 
        (itm.asin == rowData.amazonAsin || itm.asin == rowData.amazonAsinOg)
    );
    
    await sleep(300);
    console.log("foundProduct", foundProduct?._id);

    if (foundProduct && foundProduct._id) {
        return {
            range: `Input_1!V${rowIndex + 2}`,
            values: [[foundProduct._id]]
        };
    }
    return null;
}

async function updateSheet(sheetsClient: any, sheetId: string, updates: { range: string; values: string[][] }[]) {
    if (updates.length === 0) {
        console.log('No updates required.');
        return;
    }

    const resource = {
        data: updates,
        valueInputOption: 'USER_ENTERED',
    };

    await sheetsClient.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        resource,
    });

    console.log(`Updated ${updates.length} rows with product IDs.`);
    await sleep(2000);
    console.log('Waiting for 2 seconds before continuing...');
}



// In-memory storage for process status
const processStatusMap = new Map<string, ProcessStatus>();

function generateProcessId(sheetId: string): string {
    return `process_${sheetId}_${Date.now()}`;
}

async function processDataInBackground(
    processId: string,
    sheetsClient: any,
    sheetId: string,
    currentEnv: 'UAT' | 'PROD',
    token: string
) {
    try {
        const rows = await fetchSheetData(sheetsClient, sheetId);
        
        if (!rows || rows.length <= 1) {
            processStatusMap.set(processId, {
                status: 'completed',
                processedRows: 0,
                totalRows: 0,
                lastUpdated: new Date(),
                error: 'No data found'
            });
            return;
        }

        const dataRows = rows.slice(1);
        const updates: { range: string; values: string[][] }[] = [];
        let processedCount = 0;

        for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
            const rowData = processRowData(dataRows[rowIndex]);
            const update = await processRow(rowData, rowIndex, currentEnv, token);
            if (update) {
                updates.push(update);
            }
            processedCount++;
            
            // Update status every 10 rows
            if (processedCount % 10 === 0) {
                processStatusMap.set(processId, {
                    status: 'processing',
                    processedRows: processedCount,
                    totalRows: dataRows.length,
                    lastUpdated: new Date()
                });
            }
        }

        await updateSheet(sheetsClient, sheetId, updates);
        
        processStatusMap.set(processId, {
            status: 'completed',
            processedRows: dataRows.length,
            totalRows: dataRows.length,
            lastUpdated: new Date()
        });
        
    } catch (error) {
        processStatusMap.set(processId, {
            status: 'failed',
            processedRows: 0,
            totalRows: 0,
            lastUpdated: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
}

export function updateProductIdBasedOnTransaction(
    sheetsClient: any,
    sheetId: string,
    currentEnv: 'UAT' | 'PROD',
    token: string
): { processId: string; message: string } {
    const processId = generateProcessId(sheetId);
    
    // Initialize process status
    processStatusMap.set(processId, {
        status: 'processing',
        processedRows: 0,
        totalRows: 0,
        lastUpdated: new Date()
    });

    // Start processing in the background
    processDataInBackground(processId, sheetsClient, sheetId, currentEnv, token);

    return {
        processId,
        message: 'Process has been started.'
    };
}

export function getProcessStatus(processId: string): ProcessStatus | null {
    return processStatusMap.get(processId) || null;
}

// Optional: Cleanup function to remove old process statuses
export function cleanupOldProcesses(maxAgeHours: number = 24) {
    const now = new Date();
    for (const [processId, status] of processStatusMap.entries()) {
        const age = now.getTime() - status.lastUpdated.getTime();
        if (age > maxAgeHours * 60 * 60 * 1000) {
            processStatusMap.delete(processId);
        }
    }
}