
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Framework, GeneratedApp, GenBaseConfig, Project, AIModelConfig } from "../types";

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

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Custom/OpenAI Adapter ---
async function generateWithCustom(config: AIModelConfig, systemPrompt: string, userPrompt: string, isJson: boolean): Promise<any> {
  const baseUrl = config.baseUrl?.replace(/\/$/, '') || 'https://api.openai.com/v1';
  const url = `${baseUrl}/chat/completions`;
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  const body: any = {
    model: config.modelId,
    messages: messages,
    temperature: 0.2,
  };

  if (isJson) {
     body.response_format = { type: "json_object" };
     // Append JSON instruction to system prompt for models that need explicit prompting
     messages[0].content += "\n\nCRITICAL: RESPONSE MUST BE VALID JSON.";
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Custom API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content received from custom model");

  if (isJson) {
    try {
      return JSON.parse(content);
    } catch (e) {
      // Try to clean markdown code blocks
      const clean = content.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(clean);
    }
  }
  return { explanation: content }; // Mock structure for refinement if generic text
}

// --- Main Generation Function ---
export const generateApp = async (
  aiConfig: AIModelConfig,
  prompt: string, 
  framework: Framework = Framework.HTML, 
  backendConfig?: { type: 'genbase', config: GenBaseConfig }
): Promise<GeneratedApp> => {
  if (!aiConfig.apiKey) {
    throw new Error("API Key is missing. Please add it in Settings.");
  }

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

  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (aiConfig.provider === 'custom') {
         return await generateWithCustom(aiConfig, systemPrompt, `User App Description: ${prompt}`, true);
      } else {
         // Default Gemini Provider
         const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey });
         const response = await ai.models.generateContent({
            model: aiConfig.modelId || 'gemini-3-flash-preview',
            contents: [
              { role: 'user', parts: [{ text: systemPrompt }, { text: `User App Description: ${prompt}` }] }
            ],
            config: {
              responseMimeType: "application/json",
              responseSchema: appSchema,
              temperature: 0.2,
              // Only enable search for Gemini 3.0 models as per docs recommendation or if supported
              tools: aiConfig.modelId.includes('gemini-3') ? [{ googleSearch: {} }] : undefined
            }
          });

          const text = response.text;
          if (!text) throw new Error("No response from AI");
          return JSON.parse(text) as GeneratedApp;
      }

    } catch (error: any) {
      console.error(`Generation Attempt ${attempt} Failed:`, error);
      lastError = error;
      
      const isQuota = error.status === 429 || error.message?.includes('429') || error.message?.toLowerCase().includes('quota');
      const isServer = error.status === 503 || error.message?.includes('503');
      
      if (isQuota || isServer) {
         if (attempt < 3) {
            await delay(2000 * attempt);
            continue;
         } else {
            throw new Error(`AI Model Error: ${error.message}. Please check your quota or settings.`);
         }
      }
      throw error;
    }
  }
  
  throw lastError;
};

export const refineApp = async (aiConfig: AIModelConfig, currentProject: Project, userMessage: string, framework: Framework): Promise<GeneratedApp> => {
   let backendConfig: any = undefined;
   if (currentProject.backendType === 'genbase' && currentProject.genBaseConfig) {
     backendConfig = { type: 'genbase', config: currentProject.genBaseConfig };
   }
   
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
   
   return generateApp(aiConfig, prompt, Framework.HTML, backendConfig);
}
