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
async function getProcessData(processId: string) {
    // const response = await axios.get(`/api/common?action=processstatus&processId=${processId}`);
    const response = await axios.get(`/api/v2/content?action=processstatus&processId=${processId}`);
    return response.data;
}
async function clearContentProgress(processId: string) {
    const response = await axios.post(`/api/v2/content`,{
        processId,
        action: "clearprogress"
    });
    return response.data;
}

export {Login , authenticateGoogle , scrapeSheetData , clearProgress, generateContent, getProcessData, clearContentProgress}