# NotebookLM Clone — Full RAG Pipeline Application

Welcome to the **NotebookLM Clone**, a fully functional Retrieval-Augmented Generation (RAG) web application. This project allows users to upload any unseen PDF document, process it into a vector database, and engage in a natural language conversation grounded *strictly* in the uploaded document's contents.

This project was built to demonstrate a complete, end-to-end RAG architecture, addressing all assignment requirements.

---

## 🎯 Assignment Requirements Met

### 1. A Working Application (Web UI)
The project features a fully responsive, modern "Neo-Brutalism" web interface built with **Next.js 14** and **React**. It includes dynamic upload states, loading indicators, session management, and rich markdown parsing (`react-markdown`) for the chat interface.

### 2. End-to-End RAG Pipeline
The entire pipeline is implemented natively within the Next.js server runtime:
- **Ingestion**: PDFs are uploaded via the UI and parsed in memory using `WebPDFLoader`.
- **Chunking**: Text is split into semantically meaningful overlapping chunks (detailed below).
- **Embedding**: Chunks are embedded using Google's state-of-the-art `gemini-embedding-2` model.
- **Storage**: Embeddings and metadata are pushed to a cloud-hosted **Qdrant Vector Database**.
- **Retrieval**: User queries are embedded and mapped against the vector space to retrieve the top $K$ most relevant chunks.
- **Generation**: `gemini-flash-latest` generates an answer strictly constrained by the retrieved context.

### 3. Documented Chunking Strategy
The application uses the **RecursiveCharacterTextSplitter** from LangChain with the following configuration:
- `chunkSize: 1000` characters
- `chunkOverlap: 200` characters
**Why this strategy?** Breaking documents by recursive characters (paragraphs, then sentences, then words) ensures that semantically related concepts are kept together. The 200-character overlap prevents critical context from being cut in half, ensuring the LLM has complete thoughts to read during retrieval. Furthermore, zero-length or invalid chunks are automatically filtered out before vectorization to maintain database integrity.

### 4. Vector Database Integration
The system relies on **Qdrant** (via Qdrant Cloud) as the vector store. Every time a user uploads a new PDF, the system dynamically generates a unique `collectionName` (UUID), creates the collection with a 3072 dimension space, and upserts the document vectors.

### 5. LLM Grounded in Context (Not Memory)
The prompt engineering strictly enforces grounding. The system prompt provided to Gemini is:
> *"You are an AI assistant tasked with answering questions based ONLY on the provided context... If the answer is not contained in the context, say 'I'm sorry, but I cannot find the answer to this question in the provided document.' Do not use outside knowledge."*

### 6. Handles Unseen Documents
Because a new Qdrant collection is generated for every upload, the app operates completely dynamically. You can upload any novel PDF, and the system will successfully index and query it on the fly.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 (App Router), React, Vanilla CSS (Neobrutalism Design), Lucide-React, React-Markdown.
- **Backend**: Next.js API Routes (Serverless Node.js).
- **RAG Orchestration**: LangChain (`@langchain/community`, `@langchain/google-genai`, `@langchain/qdrant`).
- **LLM & Embeddings**: Google Generative AI (`gemini-flash-latest`, `gemini-embedding-2`).
- **Vector Store**: Qdrant Vector Database.

---

## 🚀 Running the Project Locally

### Prerequisites
Make sure you have Node.js (v18+) installed. You will also need API keys for Google Gemini and a Qdrant Cloud cluster.

### 1. Clone & Install
```bash
git clone https://github.com/AditeeySingh/NotebookLM-Clone.git
cd notebooklm-clone
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the root directory and add your keys:
```env
GEMINI_API_KEY=your_google_gemini_key_here
QDRANT_URL=your_qdrant_cloud_cluster_url_here
QDRANT_API_KEY=your_qdrant_api_key_here
```

### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 💡 How to Use the App
1. **Upload a PDF**: Drag and drop or click to upload a PDF in the Knowledge Base sidebar.
2. **Index**: Click "Index Document!". The server will parse, chunk, embed, and store the document in Qdrant.
3. **Chat**: Once indexed, use the chat input to ask questions about the document. The app features robust exponential backoff retry logic to handle any temporary LLM rate limits gracefully.
4. **Start Over**: Click the "Start Over" button to wipe the current context and upload a brand new document.
