import { NextResponse } from "next/server";
 
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
    return NextResponse.json({ message: "Hello, world!" });
}