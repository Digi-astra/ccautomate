import axios, { AxiosError } from 'axios';
import { CONTANTS } from '@/_shared/constant';
// import { CustomError } from '@/_shared/utils';



async function Login(email: string, password: string, environment: 'UAT' | 'PROD') {
    try {
        const response = await axios.post(`${CONTANTS.ENV_URLS[environment]}api/v1/login`, { email, password });
        console.log({response});
        return {...response.data, success: true};
    } catch (error) {
        console.log({error});
        return {
            success: false,
            message: error instanceof AxiosError ? error.response?.data?.data?.message : 'An unknown error occurred'
        };
    }
}

async function authenticateGoogle(clientType: 'drive' | 'sheets' | 'progress' = 'drive') {
    try {
        const response = await axios.get(`/api/googleauth?clientType=${clientType}`);
        return response.data;
    } catch (error) {
        return {
            success: false,
            message: error instanceof AxiosError ? error.response?.data?.message : 'An unknown error occurred'
        };
    }
}

async function clearProgress(processId?: string) {
    const response = await axios.post(`/api/googleauth`,{
        processId,
        action: "clearprogress"
    });
    return response.data;
}

async function scrapeSheetData(sheetId: string, action: string, contentType: string, currentEnv: string, token: string) {
    try {
        const response = await axios.post(`/api/googleauth`,{
            currentEnv,
            token,
            action,
            contentType,
            sheetId
        });
        return response.data;
    } catch (error) {
        return {
            success: false,
            message: error instanceof AxiosError ? error.response?.data?.message : 'An unknown error occurred'
        };
    }
}

async function generateContent(sheetId: string, action: string, contentType: string, currentEnv: string, token: string) {
    try {
        console.log({sheetId, action, contentType, currentEnv, token});
        const response = await axios.post(`/api/v2/content`,{
            sheetId,
            currentEnv,
            contentType,
            token,
            action
        });
        return response.data;
    } catch (error) {
        return {
            success: false,
            message: error instanceof AxiosError ? error.response?.data?.message : 'An unknown error occurred'
        };
    }
}

// async function authenticateGoogle() {
//     try {
//         const auth = new google.auth.GoogleAuth({
//             credentials: zikrajson,
//             scopes: [
//                 'https://www.googleapis.com/auth/drive.readonly',
//                 'https://www.googleapis.com/auth/spreadsheets'
//             ],
//         });

//         const authClient = await auth.getClient() as OAuth2Client;

//         // Return both Drive and Sheets clients
//         return {
//             sheetsClient: google.sheets({
//                 version: 'v4',
//                 auth: authClient
//             }),
//             driveClient: google.drive({
//                 version: 'v3',
//                 auth: authClient
//             })
//         };
//     } catch (error) {
//         console.error('Google authentication error:', error);
//         throw new Error('Failed to authenticate with Google services');
//     }
// }

export {Login , authenticateGoogle , scrapeSheetData , clearProgress, generateContent}