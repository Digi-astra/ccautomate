import { NextRequest, NextResponse } from "next/server";
import contentcreation from "@/_serverfeatures/contentcreation/contentcreation";
import {CustomError} from "@/_shared/utils";
import statusInstance from "@/_serverfeatures/common/status";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    try{
        if (action === "processstatus") {
            const processId = searchParams.get('processId');
            if(!processId){
                throw new CustomError('Process ID is required', 400);
            }
            const status = statusInstance.getData(processId);
            return NextResponse.json({
                success: true,
                message: 'Status fetched successfully',
                data: status
            });
        }
        if (action === "clearprogress") {
            const processId = searchParams.get('processId');
            if(!processId){
                throw new CustomError('Process ID is required', 400);
            }
            statusInstance.clearData(processId);
            return NextResponse.json({
                success: true,
                message: 'Progress cleared successfully',
                data: null
            });
        }
        return NextResponse.json({ message: "Hello World" , success: true });
    }catch(error: any){
        return NextResponse.json({ message: error.message , success: false }, { status: error.statusCode });
    }
}

export async function POST(request: NextRequest) {
    const { sheetId, currentEnv, contentType, token , action} = await request.json();
    try{
        if(action === "start_content_generation"){
            if(!sheetId || !currentEnv || !contentType || !token){
                throw new CustomError("Missing required fields", 400);
            }
            const contentCreation = new contentcreation(sheetId, currentEnv, contentType, token, "Input_1");
            contentCreation.startGeneration();
            let processId = contentCreation.getProcessId();
            return NextResponse.json({ message: "Content creation started" , success: true, processId });
        }

        throw new CustomError("No valid action found", 400);
    }catch(error: any){
        return NextResponse.json({ message: error.message , success: false }, { status: error.statusCode });
    }
}