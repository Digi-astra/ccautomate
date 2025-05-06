interface SheetRow {
    transactionId: string;
    productId: string;
    amazonUrl: string;
    amazonAsinOg: string;
    amazonAsin: string;
}

interface ProcessStatus {
    status: 'processing' | 'completed' | 'failed';
    processedRows: number;
    totalRows: number;
    lastUpdated: Date;
    error?: string;
}

interface Product {
    amazon_link: string;
    rowIndex: number;
    asin?: string;
}

interface ScrapeResponse {
    data: {
        transactionId: string;
    };
    message?: string;
}

interface ProductDetail {
    _id: string;
    url: string;
    allImages?: string[];
    asin?: string;
    productName?: string;
    breadcrumbs?: string;
    variationData?: any[];
}

interface ProductDetails {
    data: ProductDetail[];
}

interface ScrapeSuccessResult {
    success: true;
    data: {
        transactionId: string;
        link: string;
    };
}

interface ScrapeErrorResult {
    success: false;
    error: string;
}

type ScrapeResult = ScrapeSuccessResult | ScrapeErrorResult;

export type { 
    SheetRow, 
    ProcessStatus, 
    Product, 
    ScrapeResponse, 
    ProductDetails,
    ProductDetail,
    ScrapeSuccessResult, 
    ScrapeErrorResult, 
    ScrapeResult 
};