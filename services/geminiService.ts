
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Framework, GeneratedApp, GenBaseConfig, Project } from "../types";

const appSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    files: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "File name with extension (e.g. index.html, script.js, style.css, db/schema.sql, api/hello.js, package.json)" },
          content: { type: Type.STRING, description: "Full source code content of the file" },
          language: { type: Type.STRING, description: "Language identifier (html, css, javascript, sql, json)" }
        },
        required: ["name", "content", "language"]
      }
    },
    previewHtml: {
      type: Type.STRING,
      description: "A single, standalone HTML file string. CRITICAL: It must contain a global error handler. It must use CDN links. It should inline the JS logic for immediate execution."
    },
    explanation: {
      type: Type.STRING,
      description: "A message to the user explaining what was built. CRITICAL: Include the SQL schema used."
    }
  },
  required: ["files", "previewHtml", "explanation"]
};

export const generateApp = async (
  apiKey: string,
  prompt: string, 
  framework: Framework = Framework.HTML, 
  backendConfig?: { type: 'genbase', config: GenBaseConfig }
): Promise<GeneratedApp> => {
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please add it in Settings.");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  // Using a model capable of tools and high reasoning
  const modelName = 'gemini-3-flash-preview'; 

  // Get the current origin to ensure deployed apps can still hit the main GenBase API
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://supa-app-builder.vercel.app';

  const backendInstructions = `
    2. **BACKEND (GenBase / Managed Postgres)**:
       - This app uses a proxy API to talk to a Postgres database.
       - **PROJECT ID**: "${backendConfig?.config.projectId || 'demo'}"
       - **API ENDPOINT**: "${origin}/api/query"
       - Create 'db/schema.sql' with the tables needed.
       - Create 'src/services/db.js':
         - Implement a helper function \`executeQuery(sql)\` that does:
           \`\`\`javascript
           export async function executeQuery(sql) {
             const res = await fetch('${origin}/api/query', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ projectId: '${backendConfig?.config.projectId || 'demo'}', sql })
             });
             if (!res.ok) throw new Error(await res.text());
             return await res.json();
           }
           \`\`\`
       - IN PREVIEW HTML: You MUST inline this \`executeQuery\` function (without export) so the preview works.
       - DO NOT use localStorage.

    3. **NODE.JS BACKEND (Vercel Serverless Functions)**:
       - If the user needs server-side logic (e.g., using AI APIs, secret keys, web scraping, complex calculations), use Node.js Serverless Functions.
       - Create files in the 'api/' directory.
       - **File Format**: 'api/<function_name>.js'.
       - **Syntax** (Standard Node.js Request/Response):
         \`\`\`javascript
         export default async function handler(request, response) {
           const { name } = request.query; // or request.body
           // Perform server-side logic, call external APIs securely
           return response.status(200).json({ message: \`Hello \${name}\` });
         }
         \`\`\`
       - **Dependencies**: If you use external packages (like 'openai', 'axios', 'cheerio'), you MUST generate a 'package.json' file in the root with these dependencies.
       - **Environment Variables**: Assume keys (like OPENAI_API_KEY) are in process.env.
       - **Preview Limitation**: The 'previewHtml' runs in the browser and CANNOT call '/api/*' routes because there is no running backend server.
       - **CRITICAL PREVIEW INSTRUCTION**: In 'previewHtml', if the app logic tries to call '/api/xyz', you must MOCK the response or show a toast notification saying "Backend feature requires deployment". Do not let the app crash.
  `;

  const frameworkInstructions = `
      Target Stack: HTML5, Tailwind CSS (v4), Vanilla JavaScript.
      
      **FILES OUTPUT**:
      - index.html, script.js, style.css.
      - db/schema.sql (if tables are needed).
      - src/services/db.js (database connection).
      - api/<route>.js (if Node.js backend is needed).
      - package.json (if Node.js dependencies are needed).
      
      **PREVIEW HTML OUTPUT**:
      - Standard HTML/JS.
      - Use <script src="https://cdn.tailwindcss.com"></script>
  `;

  const systemPrompt = `
    You are an expert Senior Frontend Engineer and AI App Builder.
    Your task is to generate a complete, working web application based on the user's description.
    
    ${frameworkInstructions}

    ${backendInstructions}

    Requirements:
    1. Generate a file structure suitable for HTML/JS + Node.js Backend (Vercel).
    2. Provide full source code for every file.
    3. Generate the ROBUST 'previewHtml' string with all scripts inlined or properly referenced via CDN.
       - The Preview HTML IS CRITICAL. It must work immediately without a build step.
    4. **Explanation**:
       - Provide a helpful message.
       - ALWAYS paste the 'db/schema.sql' content in a code block if you created tables.
       - If you created Backend APIs, mention that they require deployment to Vercel to function.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }, { text: `User App Description: ${prompt}` }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: appSchema,
        temperature: 0.2,
        // Enable Google Search for grounding to get real-time info if requested
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text) as GeneratedApp;
    return data;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

export const refineApp = async (apiKey: string, currentProject: Project, userMessage: string, framework: Framework): Promise<GeneratedApp> => {
   let backendConfig: any = undefined;
   if (currentProject.backendType === 'genbase' && currentProject.genBaseConfig) {
     backendConfig = { type: 'genbase', config: currentProject.genBaseConfig };
   }
   
   // Construct a context string containing all current files
   const fileContext = currentProject.files.map(f => 
      `### FILE: ${f.name} ###\n${f.content}\n### END FILE ${f.name} ###`
   ).join('\n\n');

   const prompt = `
     Here is the current state of the application files:
     
     ${fileContext}

     The user wants to make the following changes: "${userMessage}".
     
     INSTRUCTIONS:
     1. Analyze the existing code and the user's request.
     2. Refactor the code to implement the requested changes.
     3. Return the COMPLETE content for modified files. You can include unchanged files if they help context, but prioritize the modified ones.
     4. CRITICAL: Follow PREVIEW STABILITY RULES.
     ${backendConfig ? `- MAINTAIN ${backendConfig.type.toUpperCase()} CONNECTION.` : ''}
   `;
   
   // Pass the project's framework to maintain consistency
   return generateApp(apiKey, prompt, Framework.HTML, backendConfig);
}
