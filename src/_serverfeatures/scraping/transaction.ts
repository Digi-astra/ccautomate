import { CONTANTS } from "@/_shared/constant";
import {  setProgress, generateRamdomId } from "@/_serverfeatures/utils";
import { 
    Product, 
    ScrapeResponse, 
    ProductDetails, 
    ScrapeSuccessResult, 
    ScrapeErrorResult, 
    ScrapeResult 
} from "./type";

async function batchUpdateSheetStatus(sheetsClient: any, sheetId: string, updates: any, extraData?: any) {
    // Get all rows to match ASINs in column 'asin' (assuming column A for ASINs)
    const asinColumnRange = 'Input_1!D:D'; // Assuming ASINs are in column A
    const asinResponse = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: asinColumnRange,
    });

    const asinRows = asinResponse.data.values || [];

    // console.log("Updates updates",updates);
    
    // Filter updates based on status and ASIN matching
    const data = updates.map((update: any) => {
        // For status 'InProgress', batch update as usual
        if (update.status === 'InProgress') {
            const imageColumns = update.allImages ? (update.allImages.length > 10 ? 10 : update.allImages.length) : 0;
            const rangeEndColumn = 5 + imageColumns; // 5 is for column E (status), adding imageColumns to extend horizontally
            const range = `Input_1!E${update.rowIndex + 1}:${String.fromCharCode(65 + rangeEndColumn)}${update.rowIndex + 1}`;

            return {
                range: range,
                values: [[update.status, update.transactionId || '', ...(update.allImages || [])]],
            };
        }
        // For status 'Success' or 'Error', only update if asin matches
        else if (update.status === 'Success' || update.status === 'Error') {
            const matchingRow = asinRows.findIndex((row: any) => row[0].replace('www.', '') === update.amazon_link);
            if (matchingRow !== -1) {
                const imageColumns = update.allImages ? (update.allImages.length > 10 ? 10 : update.allImages.length) : 0;
                const rangeEndColumn = 4 + imageColumns + 2; // Adjusted to ensure range matches data
            
                const rowIndex = matchingRow + 1;
                const range = `Input_1!A${rowIndex}:${String.fromCharCode(65 + rangeEndColumn)}${rowIndex}`;
            
                return {
                    range: range,
                    values: [[
                        update.productName, 
                        update.breadcrumbs,
                        asinRows[matchingRow][2], 
                        asinRows[matchingRow][3],
                        update.status, 
                        update.transactionId || '', 
                        ...(update.allImages || []).slice(0,10),
                        // asinRows[matchingRow][16],
                        // ...asinRows[matchingRow].slice(17, 38),
                        // update.asin
                    ]],
                };
            }
        }
        
        return null; // Return null if no update is needed
    }).filter((update: any) => update !== null); // Filter out any null values (no match or no update needed)

    if (data.length === 0) {
        // console.log('No rows to update.');
        return;
    }


    // this code is to update the product id in the sheet
    if(extraData){
       
        // Add product ID updates to the data array
        const productIdUpdates = extraData.data.map((product: any, index: number) => {
            const matchingRow = asinRows.findIndex((row: any) => row[0].replace('www.', '') === product.url);
            if (matchingRow !== -1) {
                return {
                    range: `Input_1!V${matchingRow + 1}`, // Column P is the product_id column
                    values: [[product._id || '']], // Use the _id as product_id
                };
            }
            return null;
        }).filter((update: any) => update !== null);

        if (productIdUpdates.length > 0) {
            data.push(...productIdUpdates);
        }
    }

    const resource = {
        data,
        valueInputOption: 'USER_ENTERED',
    };

    try {
        await sheetsClient.spreadsheets.values.batchUpdate({
            spreadsheetId: sheetId,
            resource,
        });
        // console.log(`Batch update successfull for rows: ${updates.map((u: any) => u.rowIndex + 1).join(', ')}`);
    } catch (error : any) {
        
        console.error('Batch update failed:', error.message);
    }


    // Filter updates based on status and ASIN matching
    
    const dataAsin = updates.reduce((acc: any, update: any) => {
        // For status 'Success', find a precise match
        if (update.status === 'Success') {
            const matchingRow = asinRows.findIndex((row: any) => {
                // Remove 'www.' and ensure exact domain match
                const cleanLink = row[0].replace('www.', '').toLowerCase();
                const updateLink = update.amazon_link.toLowerCase();
                return cleanLink === updateLink;
            });
    
            if (matchingRow !== -1) {
                // const range = `Input_1!AL${matchingRow + 1}`; // Adjust row index
                
                acc.push(
                    {
                        range: `Input_1!AL${matchingRow + 1}`,
                        values: [[update.asin]],
                    },
                    {
                        range: `Input_1!AN${matchingRow + 1}`,
                        values: [[update.variationData?.length > 0 ?"Yes":"No"]], // Replace with the data you want to update in AM
                    }
                );
            }
        }
        
        return acc;
    }, []);
    
    if (dataAsin.length === 0) {
        // console.log('No rows to update.');
        
        return;
    }
    
    const resourceForAsinUpdate = {
        data: dataAsin,
        valueInputOption: 'USER_ENTERED',
    };
    
    try {
        await sheetsClient.spreadsheets.values.batchUpdate({
            spreadsheetId: sheetId,
            resource: resourceForAsinUpdate,
        });

        
        // console.log(`Batch update successful for rows: ${dataAsin.map((u: any) => u.range).join(', ')}`);
    } catch (error : any) {
        
        console.error('Batch update failed:', error.message);
    }
    // run one more bad update for just asin cross check
}

// Updated function to scrape data from Amazon and return transactionId
async function scrapeAmazonProductsBatch(
    products: Product[],
    contentType: string,
    currentEnv: 'UAT' | 'PROD',
    token: string
): Promise<ScrapeResult[]> {
    const productURLs = products.map((product) => product.amazon_link);

    const requestBody = {
        isAmazonSubscriber: false,
        contentType: contentType,
        productURLs: productURLs
    };

    const scrapApiUrl = CONTANTS.ENV_URLS[currentEnv] + "api/v1/products/scrap-and-create-product";
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out')), 900 * 1000)
    );

    try {
        const response = await Promise.race([
            fetch(scrapApiUrl, {
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
            body: JSON.stringify(requestBody), // Convert the request body to a JSON string
            method: "POST"
        }), timeoutPromise]) as Response;

        const result = await response.json() as ScrapeResponse;

        if (response.ok && result.data && result.data.transactionId) {
            // If the request is successful, return the results along with transactionId
            return products.map(product => ({
                success: true,
                data: { transactionId: result.data.transactionId, link: product.amazon_link }
            }));
        } else {
            return products.map(product => ({
                success: false,
                error: `Failed to scrape product data for ${product.amazon_link}: ${result.message || response.statusText}`
            }));
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return products.map(product => ({
            success: false,
            error: `Failed to scrape product data for ${product.amazon_link}: ${errorMessage}`
        }));
    }
}


// Function to scrape product details from your internal API using transactionId
export async function getProductDetailsFromApi(transactionId: string, currentEnv: 'UAT' | 'PROD', token: string): Promise<ProductDetails | null> {
    const getProductUrl = CONTANTS.ENV_URLS[currentEnv] + `api/v1/products/product-by-transaction-id/${transactionId}?limit=50&page=0`;
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
        return result;
    } catch (error: any) {
        console.error(`Error fetching product details for transactionId ${transactionId}:`, error.message);
        return null;
    }
}

async function processBatch(sheetsClient: any, sheetId: string, batchRows: any, contentType: string, currentEnv: 'UAT' | 'PROD', token: string, index: number) {
    // Prepare the list of products to scrape
    const productsToScrape = batchRows.map((item: any) => {
        return {
            amazon_link: item.rowData[3], // Assuming amazon_link is the 4th column
            rowIndex: item.rowIndex, // Use the actual row index in the sheet for updates
        };
    });
    const processId = generateRamdomId();
    setProgress(processId, {
        status: 'success',
        message: 'Marking as In Progress for batch ' + index
    });
    // Update all products in this batch as "InProgress" (batch update)
    const inProgressUpdates = productsToScrape.map((product: any) => ({
        rowIndex: product.rowIndex,
        status: 'InProgress',
        transactionId: '', // Clear transactionId when marking as "InProgress"
        asin: product.asin || '',
        amazon_link: product.link || ''
    }));
    await batchUpdateSheetStatus(sheetsClient, sheetId, inProgressUpdates);

    // Scrape the batch of products (10 items at a time)
    try {
        setProgress(processId, {
            status: 'pending',
            message: 'Scraping  for amazon product for  batch ' + index
        });
        const scrapeResults = await scrapeAmazonProductsBatch(
            productsToScrape,
            contentType,
            currentEnv,
            token
        );
        // console.log("scrapeResults?.[0]?.data?.transactionId", scrapeResults?.[0]?.data?.transactionId);
        // const scrapeProductDetails = await getProductDetailsFromApi(scrapeResults?.[0]?.data?.transactionId, currentEnv, token)
        const scrapeProductDetails = await getProductDetailsFromApi(
            scrapeResults[0]?.success ? scrapeResults[0].data.transactionId : '',
            currentEnv,
            token
        )

        setProgress(processId, {
            status: 'pending',
            message: 'Scraping product details for  batch ' + index
        });

        // Prepare success/error updates based on scrape results
        const resultUpdates = scrapeResults.map((result, index) => ({
            rowIndex: productsToScrape[index].rowIndex,
            status: result.success ? 'Success' : 'Error',
            transactionId: result.success ? result.data.transactionId : '',
            allImages: scrapeProductDetails?.data[index]?.allImages || [],
            asin: scrapeProductDetails?.data[index]?.asin || '',
            amazon_link: scrapeProductDetails?.data[index]?.url || '',
            _id: scrapeProductDetails?.data[index]?._id || '',
            productName: scrapeProductDetails?.data[index]?.productName || '',
            breadcrumbs: scrapeProductDetails?.data[index]?.breadcrumbs || '',
            variationData: scrapeProductDetails?.data[index]?.variationData || '',
        }));

        // Batch update the success/error statuses and transactionIds
        await batchUpdateSheetStatus(sheetsClient, sheetId, resultUpdates, scrapeProductDetails);
        setProgress(processId, {
            status: 'success',
            message: 'Batch ' + index + ' completed successfully'
        });

    } catch (error) {
        console.error('Error processing batch:', error);
        setProgress(processId, {
            status: 'error',
            message: 'Error processing batch ' + index
        });
    }
}


async function scrapeSheetData(sheetsClient: any, sheetId: string, contentType: string, currentEnv: 'UAT' | 'PROD', token: string) {
    const response = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Input_1', // Assuming the data is in the Input_1 sheet
    });

    const rows = response.data.values;
    if (rows && rows.length > 1) { // Assuming first row is headers
        const dataRows = rows.slice(1); // Data without headers
        const processId = generateRamdomId();

        setProgress(processId, {
            status: 'success',
            message: 'Scraping started successfully'
        });

        // Filter rows with 'Error' or 'To-Do' in status (assuming status is in column E, index 4)
        const filteredRows = dataRows.map((row: any, rowIndex: number) => ({
            rowIndex: rowIndex + 2, // Get actual row index in the sheet (considering header row)
            rowData: row
        })).filter((item: any) => {
            const status = item.rowData[4]; // Assuming status is in column E (index 4)
            return status === 'Error' || status === 'To-Do';
        });

        // console.log(`Found ${filteredRows.length} rows with status 'Error' or 'To-Do'.`);

        const filteredID  = generateRamdomId();
        if(filteredRows.length > 0){
            setProgress(filteredID, {
                status: 'success',
                message: 'Found ' + filteredRows.length + ' rows with status "Error" or "To-Do".'
            });
        }else{
            setProgress("stop", {
                status: 'stop',
                message: 'No row found with status "Error" or "To-Do".'
            });
            
        }
        // Process the filtered rows in batches of 5
        const batchSize = 10;
        let  counter = 1
        for (let i = 0; i < filteredRows.length; i += batchSize) {
            const batch = filteredRows.slice(i, i + batchSize);
            console.log("batch", batch)
            // console.log(`Processing batch ${Math.floor(i / batchSize) + 1} with ${batch.length} items`);
            // await sleep(10000)
            await processBatch(sheetsClient, sheetId, batch, contentType, currentEnv, token, counter);
            counter++
            // Delay between batches to prevent overwhelming requests (you can adjust the time as needed)
            // await new Promise((resolve) => setTimeout(resolve, 5000)); // 5-second delay between batches
        }
        // console.log("counter", counter, "filteredRows.length", filteredRows)
        setProgress("stop", {
            status: 'success',
            message: 'All batches completed successfully.'
        });

    } else {
        // console.log('No data found.');
        setProgress("stop", {
            status: 'stop',
            message: 'No data found.'
        });
    }
}

export { scrapeSheetData };