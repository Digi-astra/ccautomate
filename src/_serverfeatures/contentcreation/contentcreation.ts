import { setProgress, generateRamdomId , sleep} from "@/_serverfeatures/utils";
import { CONTANTS } from "@/_shared/constant";


async function generateContentFromSheet(sheetsClient: any, sheetId: string, currentEnv: 'UAT' | 'PROD', contentType: string, token: string) {
    // Fetch data from the Google Sheet
    const response = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Input_1!A:Z', // Adjust the range as necessary, assuming up to Column W (index 22)
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) { // Check if there are rows and skip the header
        console.log('No data found.');
        return;
    }

    const dataRows = rows.slice(1); // Data without headers

    // Filter rows with "To-Do" in content_status (Column W)
    const toDoRows = dataRows.filter((row: any) => row[22] === "To-Do" && row[21]); // Only consider rows where Column W = "To-Do" and Column V (productId) exists

    if (toDoRows.length === 0) {
        console.log('No "To-Do" rows found.');
        return;
    }

    console.log(`Found ${toDoRows.length} "To-Do" rows.`);

    // Process the filtered rows in batches of 5
    const batchSize = 5;
    for (let i = 0; i < toDoRows.length; i += batchSize) {
        const batch = toDoRows.slice(i, i + batchSize); // Get a batch of up to 5 rows

        const promises = batch.map(async (row: any, batchIndex: number) => {
            const rowIndex = dataRows.indexOf(row); // Get the original row index from the entire dataset
            const productId = row[21]; // Column V is index 21

            console.log(`Processing row ${rowIndex + 2}: Found "To-Do" status`);

            // Construct the payload based on the provided fields
            const payload = {
                company_metadata: {
                    isCreate: true,
                    colorScheme: [],
                    brandLogo: "",
                    brandLogoFileName: "",
                    selectedLanguage: "en",
                    brandProductInfo: [
                        {
                            productId: productId, // From Column V
                            companyAdjective: row[20] ? row[20].split(',').map((adj: string) => adj.trim()) : [], // Column U (index 20)
                            generateAIProducts: row[18] === 'TRUE', // Column S (index 18)
                            generateIngredientMaterial: row[19] === 'TRUE', // Column T (index 19)
                            inpaintingInputImage: "",
                            productImages: row[16] ? row[16].split(',').map((url: string) => url.trim()) : [], // Column Q (index 16)
                            uploadedProductImages: []
                        }
                    ],
                    styleName: row[17] || "RKS 002" // Column R (index 17), default to "RKS 002" if empty
                },
                use_company_metadata: true,
                productIds: [productId], // Array of productIds, single value from Column V
                contentType: contentType
            };

            console.log(`Generated Payload for Row ${rowIndex + 2}:`);

            // Mark the row as "InProgress" before making the API call
            await updateContentStatus(sheetsClient, sheetId, rowIndex, "InProgress");

            // Simulate an API call with the generated payload (Replace with actual AI call)
            try {
                const contentGetApiRes = await contentGenApi(payload, currentEnv, token);
                console.log('AI contentGetApiRes:', contentGetApiRes);

                const txnId = contentGetApiRes.data.data.transactionId;

                const contentId = await getContentDetailsFromApi(txnId, currentEnv, token);
                console.log("contentId", contentId.data[0]._id);

                // Update Columns X (txnId) and Y (contentId) in the sheet
                await updateTransactionAndContentId(
                    sheetsClient, sheetId, rowIndex, contentId.data[0]._id,
                     `${CONTANTS.UI_URLS[currentEnv]}content-editor?id=${contentId.data[0]._id}&txn=${txnId}`
                );

                // If the AI call was successful, mark the content_status as "Success"
                await updateContentStatus(sheetsClient, sheetId, rowIndex, "Success");

            } catch (error) {
                console.error('Error during AI call:', error);

                // If API fails, mark the row back to "To-Do"
                await updateContentStatus(sheetsClient, sheetId, rowIndex, "To-Do");
            }
        });

        // Wait for all API calls in the batch to complete
        await Promise.all(promises);

        // Optionally, add a delay between batches to avoid overwhelming the server
        console.log(`Batch ${Math.floor(i / batchSize) + 1} completed. Waiting 2 seconds before next batch.`);
        await sleep(2000); // Add a 2-second delay between batches
    }

    console.log("Processing complete for all rows.");
}


// Function to update content status in the Google Sheet for a specific row
async function updateContentStatus(sheetsClient: any, sheetId: string, rowIndex: number, newStatus: string) {
    const updates = [{
        range: `Input_1!W${rowIndex + 2}`, // Update content_status in Column W (index 22), adjust rowIndex to 1-based index
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

    console.log(`Updated content status to "${newStatus}" for row ${rowIndex + 2}.`);
}



// Function to update txnId and contentId in the Google Sheet
async function updateTransactionAndContentId(sheetsClient: any, sheetId: string, rowIndex: number, txnId: string, contentId: string) {

    const updates = [
        {
            range: `Input_1!X${rowIndex + 2}`, // Update txnId in Column X (index 24)
            values: [[txnId]]
        },
        {
            range: `Input_1!Y${rowIndex + 2}`, // Update contentId in Column Y (index 25)
            values: [[contentId]]
        },
        {
            range: `Input_1!Z${rowIndex + 2}`, // Update current timestamp in Column Z (index 26)
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

    console.log(`Updated txnId and contentId for row ${rowIndex + 2}.`);
}

export async function getContentDetailsFromApi(transactionId: string, currentEnv: 'UAT' | 'PROD', token: string) {
    const getContentUrl = CONTANTS.ENV_URLS[currentEnv] + `api/v1/content/fetch-content-by-transaction-id/${transactionId}?limit=50&offset=0`;
    try {
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
        return result.data; // Assuming the product details are in the 'data' field of the response
    } catch (error: any) {
        console.error(`Error fetching product details for transactionId ${transactionId}:`, error.message);
        return null;
    }
}

// Updated function to scrape data from Amazon and return transactionId
async function contentGenApi(payload: any, currentEnv: 'UAT' | 'PROD', token: string) {
    const scrapApiUrl = CONTANTS.ENV_URLS[currentEnv] + "api/v1/content/create-content";
    try {
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
            return {
                success: true,
                data: result.data
            };
        } else {
            // If the request fails, return an error for each product
            return {
                success: false,
                error: `Failed to generate content product data for: ${result.message || response.statusText}`
            };
        }

    } catch (error: any) {
        // Handle any unexpected errors during the fetch request
        console.error('Error in content gen:', error);
        return {
            success: false,
            error: `Failed to generate content product data for: ${error.message}`
        };
    }
}