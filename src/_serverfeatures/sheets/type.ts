export interface SheetUpdate {
    range: string;
    values: string[][];
}

export interface BatchUpdate {
    rowIndex: number;
    status: string;
    transactionId?: string;
    allImages?: string[];
    asin?: string;
    amazon_link?: string;
    _id?: string;
    productName?: string;
    breadcrumbs?: string;
    variationData?: any;
}