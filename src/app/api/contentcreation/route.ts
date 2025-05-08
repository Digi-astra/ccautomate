import { NextResponse } from "next/server";
import { generateRamdomId, setProgress} from '@/_serverfeatures/utils';
import {generateContentFromSheet} from '@/_serverfeatures/contentcreation/contentcreation';
import { CustomError } from "@/_shared/utils";
import { 
    clearProgress,
    getGoogleAuth,
    getProgress,
    clearAllProgress 
} from '@/_serverfeatures/utils';
import { google } from "googleapis";

export async function GET(request: Request) {
    return NextResponse.json({ message: "Hello, world!" });
}

export async function POST(request: Request) {
    try{
        const { sheetId, currentEnv, contentType, token , action } = await request.json();
        if(action === "generatecontent"){
            const processId = generateRamdomId();
            setProgress(processId, {
                status: "started",
                message: "Starting content generation process"
            });
            const auth = getGoogleAuth();
            const authClient = await auth.getClient();
            const sheetsClient = google.sheets({ 
                version: 'v4',
                auth: authClient
            });

            generateContentFromSheet(sheetsClient, sheetId, currentEnv, contentType, token, processId);
            return NextResponse.json({
                success: true,
                message: "Content generation process started"
            });
        }

        throw new CustomError("Invalid action parameter", 400);

    } catch (error: any) {
        return NextResponse.json({
            status: "error",
            message: error?.message
        }, { status: 500 });
    }

}