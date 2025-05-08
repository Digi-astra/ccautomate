import { ContentPayload } from "./type";
import  {CONTANTS}  from "@/_shared/constant";
class ContentApi {
    private processId: string;
    private currentEnv: 'UAT' | 'PROD';
    private token: string;
    private contentType: string;
    constructor(processId: string, currentEnv: 'UAT' | 'PROD', token: string, contentType: string) {
        this.processId = processId;
        this.currentEnv = currentEnv;
        this.token = token;
        this.contentType = contentType;
    }   

    async generateContent(payload: ContentPayload, setProgress: (processId: string, progress: any) => void) {
        const scrapApiUrl = CONTANTS.ENV_URLS[this.currentEnv] + "api/v1/content/create-content";
        try {
            setProgress(this.processId, {
                status: "generating",
                message: "Generating content via API"
            });
            const response = await fetch(scrapApiUrl, {
                method: "POST",
                body: JSON.stringify(payload),
                headers: {
                    "accept": "application/json",
                    "accept-language": "en-GB,en;q=0.7",
                    "authorization": `Bearer ${this.token}`, // Pass the token in the Authorization header
                    "content-type": "application/json",
                    "priority": "u=1, i",
                    "sec-ch-ua": "\"Chromium\";v=\"128\", \"Not;A=Brand\";v=\"24\", \"Brave\";v=\"128\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"macOS\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-site",
                    "sec-gpc": "1",
                    "Referer": CONTANTS.ENV_URLS[this.currentEnv],
                    "Referrer-Policy": "strict-origin-when-cross-origin"
                },
            });
            const result = await response.json();
            if(!result.error){
                setProgress(this.processId, {
                    status: "completed",
                    message: "Content generated successfully"
                });
            }else{
                setProgress(this.processId, {
                    status: "error",
                    message: result.error.message || "Error generating content"
                });
            }
            return result;
        } catch (error: any) {
            setProgress(this.processId, {
                status: "error",
                message: error.message || "Error generating content"
            });
            console.error(error);
            throw error;
        }
    }
    
    async getContentDetails(transactionId: string , setProgress: (processId: string, progress: any) => void) {
        const getContentUrl = CONTANTS.ENV_URLS[this.currentEnv] + `api/v1/content/fetch-content-by-transaction-id/${transactionId}?limit=50&offset=0`;
        try {
            setProgress(this.processId, {
                status: "fetching",
                message: "Fetching content details"
            });
            const response = await fetch(getContentUrl, {
                method: "GET",
                headers: {
                    "accept": "application/json",
                    "authorization": `Bearer ${this.token}`, // Pass the token in the Authorization header
                    "content-type": "application/json",
                },
            });

            const result = await response.json();
            if(!result.error){
                setProgress(this.processId, {
                    status: "completed",
                    message: "Content details fetched successfully"
                });
            }else{
                setProgress(this.processId, {
                    status: "error",
                    message: result.error.message || "Error fetching content details"
                });
            }
            return result;
        } catch (error: any) {
            setProgress(this.processId, {
                status: "error",
                message: error.message || "Error fetching content details"
            });
            throw error;
        }
    }
}

export default ContentApi;