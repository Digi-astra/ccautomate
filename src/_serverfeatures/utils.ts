import { google } from "googleapis";
import zikrajson from '@/_jsondata/zikrajson.json';


let authInstance : any  = null
export function getGoogleAuth() {
  if (authInstance) {
      return authInstance;
  }
  authInstance = new google.auth.GoogleAuth({
      credentials: zikrajson,
      scopes: [
          'https://www.googleapis.com/auth/drive.readonly',
          'https://www.googleapis.com/auth/spreadsheets'
      ],
  });
  return authInstance;
}

let progressMap = new Map();
export function getProgress(processId?: string) {
    if(!processId){
        const allData = Array.from(progressMap.entries()).map(([key, value]) => ({
            id: key,
            ...value
        }));
        return allData;
    }
    return progressMap.get(processId);
}

export function setProgress(key: string, value: any) {
    progressMap.set(key, value);
}

export function clearProgress(key: string) {
    progressMap.delete(key);
}

export function clearAllProgress() {
    progressMap = new Map();
}

export function generateRamdomId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}


export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// export function generateRamdomId() {
//     return Math.floor(100000 + Math.random() * 900000).toString();
// }