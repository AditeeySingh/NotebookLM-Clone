import { NextResponse } from "next/server";
import { processAndStorePDF } from "@/lib/rag";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert File to Blob for the PDFLoader
    const blob = new Blob([await file.arrayBuffer()], { type: file.type });
    
    // Process the PDF (Chunking & Embedding) and store in Qdrant
    const collectionName = await processAndStorePDF(blob);

    return NextResponse.json({ 
      success: true, 
      collectionName,
      message: "File successfully processed and indexed into vector database." 
    });
  } catch (error: any) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process file" }, { status: 500 });
  }
}
