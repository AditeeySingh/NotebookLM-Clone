import { NextResponse } from "next/server";
import { getQdrantClient } from "@/lib/rag";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { query, collectionName } = await req.json();

    if (!query || !collectionName) {
      return NextResponse.json({ error: "Missing query or collectionName" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // 1. Retrieve the vector store for the document
    const vectorStore = await getQdrantClient(collectionName);

    // 2. Retrieval: Get the most relevant chunks
    const retriever = vectorStore.asRetriever({ k: 3 });
    const searchedChunks = await retriever.invoke(query);

    // 3. Construct context
    const contextText = searchedChunks.map(chunk => chunk.pageContent).join("\n\n---\n\n");

    const systemPrompt = `You are a highly helpful and intelligent AI assistant.
Your task is to answer the user's question ONLY using the provided context from a document.

If the context does not contain the information needed to answer the question, say "I'm sorry, but I cannot find the answer to this question in the provided document." Do not try to answer from your general knowledge.

CONTEXT:
${contextText}
`;

    // 4. Generation: Call LLM with the context
    let result = null;
    let retries = 3;
    let delay = 2000; // start with 2 seconds

    while (retries > 0) {
      try {
        result = await model.generateContent({
          contents: [
            { role: "user", parts: [{ text: systemPrompt + "\n\nUser Question: " + query }] }
          ]
        });
        break; // Success! Break out of the retry loop.
      } catch (e: any) {
        if (e.status === 503 && retries > 1) {
          console.log(`[503 Error] Retrying in ${delay/1000}s...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          retries--;
          delay *= 2; // Exponential backoff (2s, 4s...)
        } else {
          // If it's not a 503, or we're out of retries, throw the error
          throw e;
        }
      }
    }
    
    const answer = result?.response.text() || "No response generated.";

    return NextResponse.json({ 
      answer: answer,
      sources: searchedChunks.map(c => ({
        content: c.pageContent,
        metadata: c.metadata
      }))
    });

  } catch (error: any) {
    console.error("Chat Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate answer" }, { status: 500 });
  }
}
