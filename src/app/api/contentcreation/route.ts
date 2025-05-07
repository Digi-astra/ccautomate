import { NextResponse } from "next/server";
import { generateRamdomId, setProgress} from '@/_serverfeatures/utils';
import {generateContentFromSheet} from '@/_serverfeatures/contentcreation/contentcreation';
 
import { 
    clearProgress,
    getGoogleAuth,
    getProgress,
    clearAllProgress 
} from '@/_serverfeatures/utils';

export async function GET(request: Request) {
    return NextResponse.json({ message: "Hello, world!" });
}

export async function POST(request: Request) {
    const { sheetId, currentEnv, contentType, token , action } = await request.json();
    if(action === "generatecontent"){
        const processId = generateRamdomId();
        setProgress(processId, {
            status: "started",
            message: "Starting content generation process"
        });
        const sheetsClient = getGoogleAuth();
        try {
            generateContentFromSheet(sheetsClient, sheetId, currentEnv, contentType, token, processId);
            return NextResponse.json({
                status: "success",
                message: "Content generation process started"
            });
        } catch (error: any) {
            setProgress(processId, {
                status: "stop",
                message: `Error generating content: ${error?.message}`
            });
            return NextResponse.json({
                status: "failed",
                message: `Error generating content: ${error?.message}`
            }, { status: 500 });
        }

        return NextResponse.json({
            status: "error",
            message: "Invalid action parameter"
        }, { status: 400 });
    }

}