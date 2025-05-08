// // import { google } from 'googleapis';
// import { getGoogleAuth } from '@/_serverfeatures/utils';
// import { setProgress, generateRamdomId } from '@/_serverfeatures/utils';
// import { SheetUpdate, BatchUpdate } from './type';

// export class SheetOperations {
//     private sheetsClient: any;
//     private sheetId: string;

//     constructor(sheetId: string) {
//         this.sheetId = sheetId;
//     }

//     async initialize() {
//         const auth = getGoogleAuth();
//         const authClient = await auth.getClient();
//         this.sheetsClient = google.sheets({ 
//             version: 'v4',
//             auth: authClient
//         });
//     }

//     async getSheetData(range: string = 'Input_1!A:ZZ') {
//         const response = await this.sheetsClient.spreadsheets.values.get({
//             spreadsheetId: this.sheetId,
//             range,
//         });
//         return response.data.values;
//     }

//     async batchUpdateSheet(updates: SheetUpdate[]) {
//         if (updates.length === 0) {
//             return;
//         }

//         const resource = {
//             data: updates,
//             valueInputOption: 'USER_ENTERED',
//         };

//         try {
//             await this.sheetsClient.spreadsheets.values.batchUpdate({
//                 spreadsheetId: this.sheetId,
//                 resource,
//             });
//         } catch (error: any) {
//             console.error('Batch update failed:', error.message);
//             throw error;
//         }
//     }

//     async updateSheetStatus(updates: BatchUpdate[], extraData?: any) {
//         const asinColumnRange = 'Input_1!D:D';
//         const asinResponse = await this.sheetsClient.spreadsheets.values.get({
//             spreadsheetId: this.sheetId,
//             range: asinColumnRange,
//         });

//         const asinRows = asinResponse.data.values || [];
//         const data = updates.map(update => {
//             if (update.status === 'InProgress') {
//                 const imageColumns = update.allImages ? (update.allImages.length > 10 ? 10 : update.allImages.length) : 0;
//                 const rangeEndColumn = 5 + imageColumns;
//                 const range = `Input_1!E${update.rowIndex! + 1}:${String.fromCharCode(65 + rangeEndColumn)}${update.rowIndex! + 1}`;

//                 return {
//                     range: range,
//                     values: [[update.status, update.transactionId || '', ...(update.allImages || [])]],
//                 };
//             } else if (update.status === 'Success' || update.status === 'Error') {
//                 const matchingRow = asinRows.findIndex((row: any) => row[0].replace('www.', '') === update.amazon_link);
//                 if (matchingRow !== -1) {
//                     const imageColumns = update.allImages ? (update.allImages.length > 10 ? 10 : update.allImages.length) : 0;
//                     const rangeEndColumn = 4 + imageColumns + 2;
//                     const rowIndex = matchingRow + 1;
//                     const range = `Input_1!A${rowIndex}:${String.fromCharCode(65 + rangeEndColumn)}${rowIndex}`;

//                     return {
//                         range: range,
//                         values: [[
//                             update.productName, 
//                             update.breadcrumbs,
//                             asinRows[matchingRow][2], 
//                             asinRows[matchingRow][3],
//                             update.status, 
//                             update.transactionId || '', 
//                             ...(update.allImages || []).slice(0,10),
//                         ]],
//                     };
//                 }
//             }
//             return null;
//         }).filter((update: any) => update !== null);

//         if (data.length === 0) {
//             return;
//         }

//         if (extraData) {
//             const productIdUpdates = extraData.data.map((product: any) => {
//                 const matchingRow = asinRows.findIndex((row: any) => row[0].replace('www.', '') === product.url);
//                 if (matchingRow !== -1) {
//                     return {
//                         range: `Input_1!V${matchingRow + 1}`,
//                         values: [[product._id || '']],
//                     };
//                 }
//                 return null;
//             }).filter((update: any) => update !== null);

//             if (productIdUpdates.length > 0) {
//                 data.push(...productIdUpdates);
//             }
//         }

//         await this.batchUpdateSheet(data as SheetUpdate[]);
//     }

//     async updateAsinData(updates: BatchUpdate[]) {
//         const asinColumnRange = 'Input_1!D:D';
//         const asinResponse = await this.sheetsClient.spreadsheets.values.get({
//             spreadsheetId: this.sheetId,
//             range: asinColumnRange,
//         });

//         const asinRows = asinResponse.data.values || [];
//         const dataAsin = updates.reduce((acc: any, update: any) => {
//             if (update.status === 'Success') {
//                 const matchingRow = asinRows.findIndex((row: any) => {
//                     const cleanLink = row[0].replace('www.', '').toLowerCase();
//                     const updateLink = update.amazon_link!.toLowerCase();
//                     return cleanLink === updateLink;
//                 });

//                 if (matchingRow !== -1) {
//                     acc.push(
//                         {
//                             range: `Input_1!AL${matchingRow + 1}`,
//                             values: [[update.asin]],
//                         },
//                         {
//                             range: `Input_1!AN${matchingRow + 1}`,
//                             values: [[update.variationData?.length > 0 ? "Yes" : "No"]],
//                         }
//                     );
//                 }
//             }
//             return acc;
//         }, []);

//         if (dataAsin.length === 0) {
//             return;
//         }

//         await this.batchUpdateSheet(dataAsin);
//     }
// } 