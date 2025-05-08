import { NextRequest, NextResponse } from "next/server";
import contentcreation from "@/_serverfeatures/contentcreation/contentcreation";
import {CustomError} from "@/_shared/utils";

export async function GET(request: NextRequest) {
    try{
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