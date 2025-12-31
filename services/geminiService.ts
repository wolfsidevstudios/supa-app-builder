
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
          name: { type: Type.STRING, description: "File name with extension (e.g. index.html, script.js, style.css, db/schema.sql, netlify/edge-functions/hello.js)" },
          content: { type: Type.STRING, description: "Full source code content of the file" },
          language: { type: Type.STRING, description: "Language identifier (html, css, javascript, sql, toml)" }
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
  const modelName = 'gemini-3-flash-preview'; 

  const backendInstructions = `
    2. **BACKEND (GenBase / Managed Postgres)**:
       - This app uses a proxy API to talk to a Postgres database.
       - **PROJECT ID**: "${backendConfig?.config.projectId || 'demo'}"
       - **API ENDPOINT**: "/api/query"
       - Create 'db/schema.sql' with the tables needed.
       - Create 'src/services/db.js':
         - Implement a helper function \`executeQuery(sql)\` that does:
           \`\`\`javascript
           export async function executeQuery(sql) {
             const res = await fetch('/api/query', {
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

    3. **NETLIFY EDGE FUNCTIONS (Serverless)**:
       - If the user asks for server-side logic (not database), use Edge Functions.
       - Create file: 'netlify/edge-functions/<function_name>.js' (or .ts).
       - Create file: 'netlify.toml' to configure the route.
         \`\`\`toml
         [[edge_functions]]
           function = "<function_name>"
           path = "/api/<route>"
         \`\`\`
       - Edge Function Syntax:
         \`\`\`javascript
         export default async (request, context) => {
           return new Response("Hello world", {
             headers: { "content-type": "text/html" },
           });
         };
         \`\`\`
       - IMPORTANT: The 'previewHtml' cannot run Edge Functions directly. Add a comment in the UI saying "Deploy to Netlify to test Edge Functions".
  `;

  const frameworkInstructions = `
      Target Stack: HTML5, Tailwind CSS (v4), Vanilla JavaScript.
      
      **FILES OUTPUT**:
      - index.html, script.js, style.css.
      - db/schema.sql (if tables are needed).
      - netlify.toml (if edge functions are needed).
      
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
    1. Generate a file structure suitable for HTML/JS.
    2. Provide full source code for every file.
    3. Generate the ROBUST 'previewHtml' string with all scripts inlined or properly referenced via CDN.
       - The Preview HTML IS CRITICAL. It must work immediately without a build step.
    4. **Explanation**:
       - Provide a helpful message.
       - ALWAYS paste the 'db/schema.sql' content in a code block if you created tables.
       - If you created Edge Functions, mention that they require deployment to run.
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
