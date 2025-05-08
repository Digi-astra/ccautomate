import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { CustomError } from '@/_shared/utils';
import { 
    clearProgress,
    getGoogleAuth,
    getProgress,
    clearAllProgress 
} from '@/_serverfeatures/utils';
import {updateProductIdBasedOnTransaction } from '@/_serverfeatures/scraping/scraping';
import { scrapeSheetData } from '@/_serverfeatures/scraping/transaction';

const folderId = process.env.Folderid;

// Add debug logging
// console.log('Folder ID:', folderId);

// if (!folderId) {
//     throw new CustomError('Folder ID is not configured. Please set the Folderid environment variable.', 500);
// }

// GET handler for read-only operations
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const clientType = searchParams.get('clientType');
    
        const auth = getGoogleAuth();
        const authClient = await auth.getClient();

        if (clientType === 'sheets') {
            const sheetId = searchParams.get('sheetId');
            if (!sheetId) {
                throw new CustomError('Sheet ID is required', 400);
            }
            const sheetsClient = google.sheets({ 
                version: 'v4',
                auth: authClient
            });
            const response = await sheetsClient.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: 'Input_1!A:ZZ',
            });

            return NextResponse.json({
                success: true,
                message: 'Sheets received successfully',
                data: {
                    spreadsheet: response.data
                }
            });
        }

        if (clientType === 'drive') {
            const driveClient = google.drive({
                version: 'v3', 
                auth: authClient
            });
            
            // console.log('Attempting to list files from folder:', folderId);
            const files = await driveClient.files.list({
                q: `'${folderId}' in parents`,
                fields: 'nextPageToken, files(id, name)'
            });
            return NextResponse.json({
                success: true,
                message: files.data.files?.length ? 'Google sheet fetched successful' : 'No files found',
                data: {
                    files: files.data.files
                }
            });
        }

        if(clientType === 'progress'){
            const processId = searchParams.get('processId');
            if(!processId){
                const progress = getProgress();
                return NextResponse.json({
                    success: true,
                    message: 'Progress fetched successfully',
                    data: { progress }
                });
            }
            const progress = getProgress(processId);
            return NextResponse.json({
                success: true,
                message: 'Progress fetched successfully',
                data: { progress }
            });
        }

        throw new CustomError('Invalid clientType parameter', 400);
    } catch (error) {
        console.error('Google authentication error:', error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof CustomError ? error.message : 'An unknown error occurred'
            },
            { status: error instanceof CustomError ? error.status : 500 }
        );
    }
}

// POST handler for operations that modify data
export async function POST(request: Request) {
    try {
        // console.log("request", request)
        const body = await request.json();
        // console.log("body", body)
        const action = body.action;
        

        if (!action) {
            throw new CustomError('Action parameter is required', 400);
        }

        // Handle clearprogress action separately
        if(action === "clearprogress"){
            const processId = body.processId;
            let  progress = getProgress();
            // console.log("before clear progress", progress)
            if(!processId){
                clearAllProgress();
            }else{
                clearProgress(processId);
            }
            progress = getProgress();
            // console.log("after clear progress", progress)
            return NextResponse.json({
                success: true,
                message: 'Progress cleared successfully',
            });
        }

        // Handle other actions in the main try-catch block
        if (action === "scraping") {
            const sheetId = body.sheetId;
            if (!sheetId) {
                throw new CustomError('Sheet ID is required', 400);
            }
            const currentEnv = body.currentEnv;
            const token = body.token;
            if (!currentEnv || !token) {
                throw new CustomError('currentEnv and token are required', 400);
            }
            if (currentEnv !== 'UAT' && currentEnv !== 'PROD') {
                throw new CustomError('currentEnv must be either UAT or PROD', 400);
            }

            const auth = getGoogleAuth();
            const authClient = await auth.getClient();
            const sheetsClient = google.sheets({ 
                version: 'v4',
                auth: authClient
            });

            const { processId, message } = updateProductIdBasedOnTransaction(sheetsClient, sheetId, currentEnv, token);
            
            return NextResponse.json({
                success: true,
                message: message,
                data: {
                    processId,
                }
            });
        }

        if(action === "generatetransactionid"){
            // console.clear();
            // console.log("Generating transaction id's");
            const { sheetId, contentType, currentEnv, token } = body;

            if (!sheetId) {
                throw new CustomError('Sheet ID is required', 400);
            }

            if (!contentType || !currentEnv || !token) {
                throw new CustomError('contentType, currentEnv and token are required', 400);
            }

            if (!['UAT', 'PROD'].includes(currentEnv)) {
                throw new CustomError('currentEnv must be either UAT or PROD', 400);
            }

            const auth = getGoogleAuth();
            const authClient = await auth.getClient();
            const sheetsClient = google.sheets({ 
                version: 'v4',
                auth: authClient
            });
            
            scrapeSheetData(sheetsClient, sheetId, contentType, currentEnv, token);

            
            return NextResponse.json({
                success: true,
                message: 'Scraping started successfully',
                data: {
                    message : "Scraping started successfully"
                }
            },{status : 200});
        }

        throw new CustomError('Invalid action parameter', 400);
    } catch (error) {
       // console.log("error", error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof CustomError ? error.message : 'An unknown error occurred'
            },
            { status: error instanceof CustomError ? error.status : 500 }
        );
    }
}