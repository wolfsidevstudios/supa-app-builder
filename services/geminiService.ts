import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Framework, GeneratedApp, SupabaseConfig, GenBaseConfig, Project } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const appSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    files: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "File name with extension (e.g. index.html, script.js, style.css, db/schema.sql)" },
          content: { type: Type.STRING, description: "Full source code content of the file" },
          language: { type: Type.STRING, description: "Language identifier (html, css, javascript, sql)" }
        },
        required: ["name", "content", "language"]
      }
    },
    previewHtml: {
      type: Type.STRING,
      description: "A single, standalone HTML file string. CRITICAL: It must contain a global error handler. It must use CDN links with crossorigin='anonymous'. It must NOT use ESM imports. It should inline the JS logic or ensure it works within a sandboxed iframe."
    },
    explanation: {
      type: Type.STRING,
      description: "A message to the user explaining what was built. CRITICAL: If a database is used, include the SQL schema."
    }
  },
  required: ["files", "previewHtml", "explanation"]
};

export const generateApp = async (
  prompt: string, 
  framework: Framework, 
  backendConfig?: { type: 'supabase', config: SupabaseConfig } | { type: 'genbase', config: GenBaseConfig }
): Promise<GeneratedApp> => {
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  const modelName = 'gemini-3-flash-preview'; 

  let backendInstructions = '';

  if (backendConfig?.type === 'supabase') {
    backendInstructions = `
    2. **BACKEND (Supabase)**:
       - You MUST use the provided Supabase credentials:
         URL: ${backendConfig.config.url}
         KEY: ${backendConfig.config.key}
       - Create 'services/supabase.js' that initializes the client.
       - Create 'db/schema.sql' containing the SQL to create necessary tables.
       - In 'script.js', use window.supabase for operations.
    `;
  } else if (backendConfig?.type === 'genbase') {
    backendInstructions = `
    2. **BACKEND (GenBase / Managed Postgres)**:
       - This app uses a proxy API to talk to a Postgres database.
       - **PROJECT ID**: "${backendConfig.config.projectId}"
       - **API ENDPOINT**: "https://supa-app-builder.vercel.app/api/query"
       - Create 'db/schema.sql' with the tables needed.
       - Create 'services/db.js':
         - Implement a helper function \`executeQuery(sql)\` that does:
           \`\`\`javascript
           async function executeQuery(sql) {
             const res = await fetch('https://supa-app-builder.vercel.app/api/query', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ projectId: '${backendConfig.config.projectId}', sql })
             });
             if (!res.ok) throw new Error(await res.text());
             return await res.json();
           }
           \`\`\`
       - In 'script.js', use this \`executeQuery\` function for ALL data interaction.
       - Example: \`const todos = await executeQuery("SELECT * FROM todos");\`
       - DO NOT use localStorage.
    `;
  } else {
    backendInstructions = `
    2. **BACKEND (Mock)**:
       - Create 'data/initialData.js' with: \`window.initialData = [...];\`
       - Create 'services/api.js' using localStorage.
       - **SYNC**: Inside api methods, call: \`window.parent.postMessage({ type: 'DB_UPDATE', data: updatedList }, '*')\`
    `;
  }

  const systemPrompt = `
    You are an expert Senior Frontend Engineer and AI App Builder.
    Your task is to generate a complete, working web application based on the user's description.
    
    Target Stack: HTML5, Tailwind CSS (v4), Vanilla JavaScript.
    Style: Modern, Clean, Professional.

    CRITICAL PREVIEW STABILITY RULES:
    1. **NO ESM IMPORTS**: The preview runs in a standalone HTML file. Use global variables.
    2. **ERROR TRAPPING**: Inject the error handler script at the top of <head>.
    3. **DEPENDENCIES**: Use <script src="..." crossorigin="anonymous">.
       - Tailwind: https://unpkg.com/@tailwindcss/browser@4
       - Lucide: https://unpkg.com/lucide@latest
       ${backendConfig?.type === 'supabase' ? '- Supabase: https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2' : ''}

    ARCHITECTURE REQUIREMENTS:
    1. **Structure**: 
       - 'index.html', 'script.js', 'style.css'
       ${backendInstructions}

    Requirements:
    1. Generate a file structure suitable for a HTML/JS project.
    2. Provide full source code for every file.
    3. Generate the ROBUST 'previewHtml' string with all scripts inlined or properly referenced.
    4. **Explanation**:
       - Provide a helpful message.
       - If a database (Supabase or GenBase) is used, paste the 'db/schema.sql' content in a code block and explain that for GenBase, the schema is auto-applied (simulation) or needs to be run.
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

export const refineApp = async (currentProject: Project, userMessage: string, framework: Framework): Promise<GeneratedApp> => {
   let backendConfig: any = undefined;
   if (currentProject.backendType === 'supabase' && currentProject.supabaseConfig) {
     backendConfig = { type: 'supabase', config: currentProject.supabaseConfig };
   } else if (currentProject.backendType === 'genbase' && currentProject.genBaseConfig) {
     backendConfig = { type: 'genbase', config: currentProject.genBaseConfig };
   }
   
   const prompt = `
     The current app has these files: ${currentProject.files.map(f => f.name).join(', ')}.
     User wants to modify it: "${userMessage}".
     Regenerate the project files and the preview HTML.
     CRITICAL: Follow PREVIEW STABILITY RULES.
     - Keep using Tailwind v4 and Vanilla JS.
     ${backendConfig ? `- MAINTAIN ${backendConfig.type.toUpperCase()} CONNECTION.` : ''}
   `;
   
   return generateApp(prompt, Framework.HTML, backendConfig);
}