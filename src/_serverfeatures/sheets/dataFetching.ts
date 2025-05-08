import { CONTANTS } from "@/_shared/constant";
import { setProgress, generateRamdomId } from "@/_serverfeatures/utils";
import { 
    Product, 
    ScrapeResponse, 
    ProductDetails, 
    ScrapeResult 
} from "../scraping/type";

export class DataFetching {
    private currentEnv: 'UAT' | 'PROD';
    private token: string;
    private processId: string;

    constructor(currentEnv: 'UAT' | 'PROD', token: string) {
        this.currentEnv = currentEnv;
        this.token = token;
        this.processId = generateRamdomId();
    }

    async scrapeAmazonProductsBatch(products: Product[], contentType: string): Promise<ScrapeResult[]> {
        const productURLs = products.map((product) => product.amazon_link);
        const requestBody = {
            isAmazonSubscriber: false,
            contentType: contentType,
            productURLs: productURLs
        };

        const scrapApiUrl = CONTANTS.ENV_URLS[this.currentEnv] + "api/v1/products/scrap-and-create-product";
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timed out')), 900 * 1000)
        );

        try {
            const response = await Promise.race([
                fetch(scrapApiUrl, {
                    headers: {
                        "accept": "application/json",
                        "accept-language": "en-GB,en;q=0.7",
                        "authorization": `Bearer ${this.token}`,
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
                    body: JSON.stringify(requestBody),
                    method: "POST"
                }), timeoutPromise]) as Response;

            const result = await response.json() as ScrapeResponse;

            if (response.ok && result.data && result.data.transactionId) {
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

    async getProductDetailsFromApi(transactionId: string): Promise<ProductDetails | null> {
        const getProductUrl = CONTANTS.ENV_URLS[this.currentEnv] + `api/v1/products/product-by-transaction-id/${transactionId}?limit=50&page=0`;
        try {
            const response = await fetch(getProductUrl, {
                headers: {
                    "accept": "application/json",
                    "authorization": `Bearer ${this.token}`,
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

    async processBatch(products: Product[], contentType: string) {
        setProgress(this.processId, {
            status: 'pending',
            message: 'Scraping Amazon products'
        });

        const scrapeResults = await this.scrapeAmazonProductsBatch(products, contentType);
        
        setProgress(this.processId, {
            status: 'pending',
            message: 'Fetching product details'
        });

        const scrapeProductDetails = await this.getProductDetailsFromApi(
            scrapeResults[0]?.success ? scrapeResults[0].data.transactionId : ''
        );

        return {
            scrapeResults,
            scrapeProductDetails
        };
    }

    getProcessId() {
        return this.processId;
    }
} 