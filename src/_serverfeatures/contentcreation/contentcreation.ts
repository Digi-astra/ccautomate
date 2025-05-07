import { setProgress, generateRamdomId, sleep } from "@/_serverfeatures/utils";
import { CONTANTS } from "@/_shared/constant";
import { 
    CompanyMetadata, 
    BrandProductInfo, 
    ContentPayload, 
    ContentApiResponse, 
    ProcessError 
} from "./type";

//asdhsadhkjsahdkjsahdjsahdjsahdkjsahdkjsahdjsahdkjhsadjsahdjashdksad

function createError(message: string, code?: string, details?: any): ProcessError {
    const error = new Error(message) as ProcessError;
    error.code = code;
    error.details = details;
    return error;
}

function logWithContext(message: string, context: any = {}) {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        message,
        ...context
    }));
}

const { MAX_RETRIES = "3", RETRY_DELAY = "2000", BATCH_SIZE = "5", BATCH_DELAY = "2000" } = process.env;

async function retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = parseInt(MAX_RETRIES),
    delay: number = parseInt(RETRY_DELAY)
): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;
            console.warn(`Attempt ${attempt} failed:`, error);
            if (attempt < maxRetries) {
                await sleep(delay * attempt); // Exponential backoff
            }
        }
    }
    
    throw lastError;
}

async function processBatch(
    batch: any[],
    dataRows: any[],
    sheetsClient: any,
    sheetId: string,
    currentEnv: 'UAT' | 'PROD',
    contentType: string,
    token: string,
    processId: string
) {
    const promises = batch.map(async (row: any) => {
        const rowIndex = dataRows.indexOf(row);
        const productId = row[21];

        console.log(`Processing row ${rowIndex + 2}: Found "To-Do" status`);
        setProgress(processId, {
            status: "processing",
            currentRow: rowIndex + 2,
            productId,
            message: `Processing row ${rowIndex + 2}`
        });

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
            contentType: contentType
        };

        return retryOperation(async () => {
            await updateContentStatus(sheetsClient, sheetId, rowIndex, "InProgress");
            
            setProgress(processId, {
                status: "generating",
                currentRow: rowIndex + 2,
                productId,
                message: "Generating content"
            });

            const contentGetApiRes = await contentGenApi(payload, currentEnv, token);
            if (!contentGetApiRes.success || !contentGetApiRes.data?.data?.transactionId) {
                throw new Error('Failed to get transaction ID from API response');
            }

            const txnId = contentGetApiRes.data.data.transactionId;
            const contentId = await getContentDetailsFromApi(txnId, currentEnv, token);
            
            if (!contentId?.data?.[0]?._id) {
                throw new Error('Failed to get content ID from API response');
            }

            await updateTransactionAndContentId(
                sheetsClient, sheetId, rowIndex, contentId.data[0]._id,
                `${CONTANTS.UI_URLS[currentEnv]}content-editor?id=${contentId.data[0]._id}&txn=${txnId}`
            );

            await updateContentStatus(sheetsClient, sheetId, rowIndex, "Success");

            setProgress(processId, {
                status: "completed",
                currentRow: rowIndex + 2,
                productId,
                message: "Row processing completed"
            });

            return { success: true, rowIndex };
        });
    });

    return Promise.all(promises);
}

export async function generateContentFromSheet(sheetsClient: any, sheetId: string, currentEnv: 'UAT' | 'PROD', contentType: string, token: string, processId: string) {
    setProgress(processId, {
        status: "started",
        message: "Starting content generation process"
    });

    const response = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Input_1!A:Z',
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
        setProgress(processId, {
            status: "completed",
            message: "No data found"
        });
        console.log('No data found.');
        return;
    }

    const dataRows = rows.slice(1);
    const toDoRows = dataRows.filter((row: any) => row[22] === "To-Do" && row[21]);

    if (toDoRows.length === 0) {
        setProgress(processId, {
            status: "completed",
            message: "No To-Do rows found"
        });
        console.log('No "To-Do" rows found.');
        return;
    }

    setProgress(processId, {
        status: "processing",
        totalRows: toDoRows.length,
        message: `Found ${toDoRows.length} "To-Do" rows`
    });

    console.log(`Found ${toDoRows.length} "To-Do" rows.`);

    for (let i = 0; i < toDoRows.length; i += parseInt(BATCH_SIZE)) {
        const batch = toDoRows.slice(i, i + parseInt(BATCH_SIZE));
        const batchNumber = Math.floor(i / parseInt(BATCH_SIZE)) + 1;
        const totalBatches = Math.ceil(toDoRows.length / parseInt(BATCH_SIZE));
        
        setProgress(processId, {
            status: "processing",
            currentBatch: batchNumber,
            totalBatches,
            message: `Processing batch ${batchNumber} of ${totalBatches}`
        });

        console.log(`Processing batch ${batchNumber} of ${totalBatches}`);
        
        try {
            await processBatch(batch, dataRows, sheetsClient, sheetId, currentEnv, contentType, token, processId);
            console.log(`Batch ${batchNumber} completed successfully.`);
        } catch (error) {
            console.error(`Error processing batch ${batchNumber}:`, error);
            setProgress(processId, {
                status: "error",
                currentBatch: batchNumber,
                error: error.message,
                message: `Error in batch ${batchNumber}`
            });
        }

        if (i + parseInt(BATCH_SIZE) < toDoRows.length) {
            setProgress(processId, {
                status: "waiting",
                currentBatch: batchNumber,
                message: `Waiting before next batch`
            });
            console.log(`Waiting ${parseInt(BATCH_DELAY)}ms before next batch...`);
            await sleep(parseInt(BATCH_DELAY));
        }
    }

    setProgress(processId, {
        status: "completed",
        message: "All rows processed successfully"
    });
    console.log("Processing complete for all rows.");
}

async function updateContentStatus(sheetsClient: any, sheetId: string, rowIndex: number, newStatus: string) {
    const processId = generateRamdomId();
    try {
        setProgress(processId, {
            status: "updating",
            message: `Updating content status for row ${rowIndex + 2}`
        });

        const updates = [{
            range: `Input_1!W${rowIndex + 2}`,
            values: [[newStatus]]
        }];

        const resource = {
            data: updates,
            valueInputOption: 'USER_ENTERED',
        };

        await sheetsClient.spreadsheets.values.batchUpdate({
            spreadsheetId: sheetId,
            resource,
        });

        setProgress(processId, {
            status: "completed",
            message: `Updated content status successfully`
        });

        logWithContext(`Updated content status`, { rowIndex: rowIndex + 2, newStatus });
    } catch (error: any) {
        setProgress(processId, {
            status: "error",
            message: `Failed to update content status`,
            error: error?.message
        });
        throw createError(
            `Failed to update content status for row ${rowIndex + 2}`,
            'UPDATE_STATUS_ERROR',
            { error, rowIndex, newStatus }
        );
    }
}

async function updateTransactionAndContentId(
    sheetsClient: any,
    sheetId: string,
    rowIndex: number,
    txnId: string,
    contentId: string
) {
    const processId = generateRamdomId();
    try {
        setProgress(processId, {
            status: "updating",
            message: `Updating transaction and content IDs for row ${rowIndex + 2}`
        });

        const updates = [
            {
                range: `Input_1!X${rowIndex + 2}`,
                values: [[txnId]]
            },
            {
                range: `Input_1!Y${rowIndex + 2}`,
                values: [[contentId]]
            },
            {
                range: `Input_1!Z${rowIndex + 2}`,
                values: [[new Date().toISOString()]]
            }
        ];

        const resource = {
            data: updates,
            valueInputOption: 'USER_ENTERED',
        };

        await sheetsClient.spreadsheets.values.batchUpdate({
            spreadsheetId: sheetId,
            resource,
        });

        setProgress(processId, {
            status: "completed",
            message: `Updated transaction and content IDs successfully`
        });

        logWithContext(`Updated transaction and content IDs`, { rowIndex: rowIndex + 2, txnId, contentId });
    } catch (error) {
        setProgress(processId, {
            status: "error",
            message: `Failed to update transaction and content IDs`,
            error: error.message
        });
        throw createError(
            `Failed to update transaction and content IDs for row ${rowIndex + 2}`,
            'UPDATE_IDS_ERROR',
            { error, rowIndex, txnId, contentId }
        );
    }
}

export async function getContentDetailsFromApi(transactionId: string, currentEnv: 'UAT' | 'PROD', token: string) {
    const processId = generateRamdomId();
    const getContentUrl = CONTANTS.ENV_URLS[currentEnv] + `api/v1/content/fetch-content-by-transaction-id/${transactionId}?limit=50&offset=0`;
    try {
        setProgress(processId, {
            status: "fetching",
            message: `Fetching content details for transaction ${transactionId}`
        });

        const response = await fetch(getContentUrl, {
            headers: {
                "accept": "application/json",
                "authorization": `Bearer ${token}`, // Pass the token in the Authorization header
                "content-type": "application/json",
            },
            method: "GET"
        });

        if (!response.ok) {
            throw new Error(`Failed to get product details for transactionId ${transactionId}: ${response.statusText}`);
        }

        const result = await response.json();
        setProgress(processId, {
            status: "completed",
            message: `Successfully fetched content details`
        });
        return result.data; // Assuming the product details are in the 'data' field of the response
    } catch (error: any) {
        setProgress(processId, {
            status: "error",
            message: `Error fetching content details`,
            error: error.message
        });
        console.error(`Error fetching product details for transactionId ${transactionId}:`, error.message);
        return null;
    }
}

// Updated function to scrape data from Amazon and return transactionId
async function contentGenApi(payload: ContentPayload, currentEnv: 'UAT' | 'PROD', token: string): Promise<ContentApiResponse> {
    const processId = generateRamdomId();
    const scrapApiUrl = CONTANTS.ENV_URLS[currentEnv] + "api/v1/content/create-content";
    try {
        setProgress(processId, {
            status: "generating",
            message: "Generating content via API"
        });

        const response = await fetch(scrapApiUrl, {
            headers: {
                "accept": "application/json",
                "accept-language": "en-GB,en;q=0.7",
                "authorization": `Bearer ${token}`, // Pass the token in the Authorization header
                "content-type": "application/json",
                "priority": "u=1, i",
                "sec-ch-ua": "\"Chromium\";v=\"128\", \"Not;A=Brand\";v=\"24\", \"Brave\";v=\"128\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"macOS\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-site",
                "sec-gpc": "1",
                "Referer": CONTANTS.ENV_URLS[currentEnv],
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            body: JSON.stringify(payload), // Convert the request body to a JSON string
            method: "POST"
        });

        const result = await response.json(); // Parse the response as JSON

        if (response.ok && result.data) {
            console.log("result.data",result.data);
            setProgress(processId, {
                status: "completed",
                message: "Content generated successfully"
            });
            return {
                success: true,
                data: result.data
            };
        } else {
            setProgress(processId, {
                status: "error",
                message: `Failed to generate content: ${result.message || response.statusText}`
            });
            // If the request fails, return an error for each product
            return {
                success: false,
                error: `Failed to generate content product data for: ${result.message || response.statusText}`
            };
        }

    } catch (error: any) {
        // Handle any unexpected errors during the fetch request
        setProgress(processId, {
            status: "error",
            message: `Error generating content: ${error.message}`
        });
        console.error('Error in content gen:', error);
        return {
            success: false,
            error: `Failed to generate content product data for: ${error.message}`
        };
    }
}