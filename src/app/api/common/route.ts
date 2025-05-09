import { NextResponse } from "next/server";
// import { getProgress } from "@/_serverfeatures/utils";
import { CustomError } from "@/_shared/utils";
import statusInstance from "@/_serverfeatures/common/status";



function handleError(error: any) {
    return NextResponse.json(
        {
            success: false,
            message: error instanceof CustomError ? error.message : 'An unknown error occurred'
        },
        { status: error instanceof CustomError ? error.status : 500 }
    );
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    try {
        if (action === "processstatus") {
            const processId = searchParams.get('processId');
            if(!processId){
                throw new CustomError('Process ID is required', 400);
            }
            const status = statusInstance.getData(processId);
            return NextResponse.json({
                success: true,
                message: 'Status fetched successfully',
                data: { status }
            });
        }
        
        throw new CustomError('Invalid action parameter', 400);
    } catch (error: any) {
        return handleError(error);
    }
}


