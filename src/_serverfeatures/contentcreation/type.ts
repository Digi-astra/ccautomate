export interface CompanyMetadata {
    isCreate: boolean;
    colorScheme: string[];
    brandLogo: string;
    brandLogoFileName: string;
    selectedLanguage: string;
    brandProductInfo: BrandProductInfo[];
    styleName: string;
}

export interface BrandProductInfo {
    productId: string;
    companyAdjective: string[];
    generateAIProducts: boolean;
    generateIngredientMaterial: boolean;
    inpaintingInputImage: string;
    productImages: string[];
    uploadedProductImages: string[];
}

export interface ContentPayload {
    company_metadata: CompanyMetadata;
    use_company_metadata: boolean;
    productIds: string[];
    contentType: string;
}

export interface ContentApiResponse {
    success: boolean;
    data?: {
        data: {
            transactionId: string;
        };
    };
    error?: string;
}

export interface ProcessError extends Error {
    code?: string;
    details?: any;
}
