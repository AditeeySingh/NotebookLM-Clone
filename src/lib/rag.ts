import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { v4 as uuidv4 } from "uuid";

// We use the Gemini embeddings model
export const getEmbeddings = () => {
  return new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-2", // Standard Gemini embedding model
    apiKey: process.env.GEMINI_API_KEY || "dummy_key",
  });
};

export const getQdrantClient = async (collectionName: string) => {
  const url = process.env.QDRANT_URL || "http://localhost:6333";
  const apiKey = process.env.QDRANT_API_KEY || "";

  const embeddings = getEmbeddings();

  return await QdrantVectorStore.fromExistingCollection(embeddings, {
    url,
    apiKey,
    collectionName,
  });
};

/**
 * Process a PDF Blob, chunk it, and store embeddings in Qdrant
 */
export const processAndStorePDF = async (pdfBlob: Blob): Promise<string> => {
  // 1. Load PDF
  const loader = new WebPDFLoader(pdfBlob, {
    parsedItemSeparator: " ",
  });
  const rawDocs = await loader.load();

  // 2. Chunking Strategy
  // We use RecursiveCharacterTextSplitter:
  // It tries to split on paragraphs, then sentences, then words, keeping semantically related text together.
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const docs = await textSplitter.splitDocuments(rawDocs);

  // Filter out any empty chunks to prevent embedding failures or dimension errors
  const processedDocs = docs
    .filter(doc => doc.pageContent && doc.pageContent.trim().length > 0)
    .map((doc, i) => {
      return new Document({
        pageContent: doc.pageContent,
        metadata: {
          ...doc.metadata,
          chunkId: i,
        },
      });
    });

  if (processedDocs.length === 0) {
    throw new Error("No readable text could be extracted from this PDF.");
  }

  // 3. Generate a unique collection name for this document
  const collectionName = `doc_${uuidv4().replace(/-/g, "_")}`;

  const url = process.env.QDRANT_URL || "http://localhost:6333";
  const apiKey = process.env.QDRANT_API_KEY || "";

  // 4. Manually embed and filter out any zero-dimension vectors
  const embeddings = getEmbeddings();
  const texts = processedDocs.map(d => d.pageContent);
  const vectorArrays = await embeddings.embedDocuments(texts);

  const validDocs = [];
  const validVectors = [];

  for (let i = 0; i < processedDocs.length; i++) {
    if (vectorArrays[i] && vectorArrays[i].length > 0) {
      validDocs.push(processedDocs[i]);
      validVectors.push(vectorArrays[i]);
    }
  }

  if (validDocs.length === 0) {
    throw new Error("Failed to generate valid embeddings for this document.");
  }

  // 5. Store in Qdrant
  const vectorStore = new QdrantVectorStore(embeddings, {
    url,
    apiKey,
    collectionName,
  });

  await vectorStore.addVectors(validVectors, validDocs);

  return collectionName;
};
