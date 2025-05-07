import { NextResponse } from "next/server";
import { getProgress } from "@/_serverfeatures/utils";
import { CustomError } from "@/_shared/utils";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    try {
        if(action === "processstatus"){
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
    } catch (error: any) {
        
        return NextResponse.json(
            {
                success: false,
                message: error instanceof CustomError ? error.message : 'An unknown error occurred'
            },
            { status: error instanceof CustomError ? error.status : 500 }
        );
    }
}

export async function POST(request: Request) {
    const { action } = await request.json();
    if(action === "getallcontenttypes"){
        return NextResponse.json({ message: "Hello, world!" });
    }
}
