import { google } from 'googleapis';
import { getGoogleAuth } from '@/_serverfeatures/utils';
import { setProgress, generateRamdomId } from '@/_serverfeatures/utils';
// import { SheetUpdate, BatchUpdate } from './type';

class SheetOperations {
    private sheetsClient: any;
    private sheetId: string;

    constructor(sheetId: string) {
        this.sheetId = sheetId;
    }

    async initialize() {
        const auth = getGoogleAuth();
        const authClient = await auth.getClient();
        this.sheetsClient = google.sheets({ 
            version: 'v4',
            auth: authClient
        });
    }

    async getSheetData(range: string = 'Input_1!A:ZZ') {
        console.log(this)
        const response = await this.sheetsClient.spreadsheets.values.get({
            spreadsheetId: this.sheetId,
            range,
        });
        return response.data.values;
    }

    async updateSheetData(values: any[]) {
        const resource = {
            data: values,
            valueInputOption: 'USER_ENTERED',
        };
        await this.sheetsClient.spreadsheets.values.batchUpdate({
            spreadsheetId: this.sheetId,
            resource,
        });
    }

    /**
     * Filters rows based on specified conditions
     * @param data Array of rows to check
     * @param objects Array of objects containing index and expected value to match
     * @returns Object containing matching and non-matching rows
     * 
     * @example
     * // Check rows where column 21 exists and column 22 equals "To-Do"
     * checkRow(data, [
     *   { index: 21, value: true },  // Check if value exists
     *   { index: 22, value: "To-Do" } // Check exact match
     * ]);
     * 
     * // Returns:
     * // {
     * //   matchingRows: [...rows matching all conditions...],
     * //   nonMatchingRows: [...rows not matching all conditions...]
     * // }
     */
    checkRow(data: any, objects: {index: number, value: string | boolean}[]) {
        const matchingRows: any[] = [];
        const nonMatchingRows: any[] = [];
        console.log({data, objects});
        data.forEach((row: any, index: number) => {
            const matches = objects.every(obj => {
                if (typeof obj.value === 'boolean' && obj.value === true) {
                    return row[obj.index] !== undefined && row[obj.index] !== null && row[obj.index].trim() !== "";
                }
                return row[obj.index] === obj.value;
            });

            if (matches) {
                matchingRows.push({row, index});
            } else {
                nonMatchingRows.push({row, index});
            }
        });

        return {
            matchingRows,
            nonMatchingRows,
        };
    }
} 

export { SheetOperations };