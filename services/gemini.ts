import { GoogleGenAI, Type } from "@google/genai";
import { ExecutionResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are a high-fidelity SAS Studio Simulator.
Your goal is to execute user-provided SAS code virtually and return the Output and Log exactly as SAS would.

1.  **Interpretation**: Interpret standard Base SAS code (DATA steps, PROC SQL, PROC MEAN, PROC PRINT, PROC FREQ, macros) and **Graphing procedures** (PROC SGPLOT, PROC GCHART, PROC GPLOT, PROC HISTOGRAM).

2.  **Output Format**: You must return a JSON object with two fields:
    *   \`log\`: A string simulating the SAS Log window. Include timestamped notes, warnings, and errors.
    *   \`results\`: An HTML string simulating the SAS Results Viewer (ODS HTML).
        *   **Tables**: Use simple, inline CSS for tables to match the classic SAS Output style (grey headers, white cells, borders).
        *   **Graphics (CRITICAL)**: If the code involves plotting (e.g., \`proc sgplot\`, \`vbar\`, \`histogram\`, \`scatter\`), you **MUST** generate a **Scalable Vector Graphic (SVG)** string embedded directly in the HTML.
            *   **Do not** provide text descriptions like "Histogram of Horsepower". **Draw** the chart using \`<svg>\`.
            *   **Style**: Mimic "SAS ODS Graphics" style.
                *   Background: White or very light grey.
                *   Bars: Periwinkle blue (#5E73A5) or SAS Blue.
                *   Axes: Clean lines, tick marks, and labels using Arial/sans-serif fonts.
                *   Title: Centered at the top, bold.
            *   **Data**: Generate realistic visual distributions based on the dataset context (e.g., for \`SASHELP.CARS\`, show a realistic distribution of Horsepower).
        *   **Structure**: Include standard headers like "The SAS System", "The SGPLOT Procedure".
        *   If no visible output is generated, return "No output generated" wrapped in HTML.

**Example Behavior (Plot)**:
Input:
\`\`\`sas
proc sgplot data=sashelp.cars;
  histogram horsepower;
run;
\`\`\`
Output JSON:
{
  "log": "...",
  "results": "<h1>The SAS System</h1><h2>The SGPLOT Procedure</h2><div class='graph-container'><svg width='640' height='480' viewBox='0 0 640 480' xmlns='http://www.w3.org/2000/svg'><!-- Full SVG content here --></svg></div>"
}
`;

export const executeSasCode = async (code: string): Promise<ExecutionResult> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Execute this SAS code:\n\n${code}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            log: { type: Type.STRING },
            results: { type: Type.STRING },
          },
          required: ['log', 'results'],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as ExecutionResult;
  } catch (error) {
    console.error("Execution failed:", error);
    return {
      log: `ERROR: System failure during execution.\nERROR: ${error instanceof Error ? error.message : String(error)}`,
      results: "<div style='color:red; font-weight:bold;'>System Error: Unable to execute code.</div>"
    };
  }
};

export const generateSasCode = async (prompt: string, currentCode: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are an expert SAS programmer assisting a user.
            
            Current Code in Editor:
            ${currentCode}

            User Request: ${prompt}

            Task: Generate SAS code to fulfill the request.
            - If the code is empty, provide a complete starting block.
            - If code exists, provide the code to append or modify.
            - RETURN ONLY THE RAW CODE. DO NOT USE MARKDOWN. DO NOT ADD COMMENTARY OUTSIDE THE CODE.
            `,
        });
        
        let text = response.text || '';
        // Cleanup potential markdown
        text = text.replace(/^```sas\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '');
        return text;
    } catch (error) {
        console.error("Generation failed:", error);
        return `/* Error generating code: ${error instanceof Error ? error.message : String(error)} */`;
    }
};
