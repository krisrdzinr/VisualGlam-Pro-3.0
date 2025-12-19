
import { GoogleGenAI } from "@google/genai";
import { AspectRatio } from "../types";

// Using the recommended flash image model for high-speed perspective transformation.
const MODEL_NAME = 'gemini-2.5-flash-image';

/**
 * Transforms an image's perspective and lighting.
 * @param base64Image - The source image to be edited
 * @param angleName - Chosen camera angle name
 * @param lightingName - Chosen lighting preset name
 * @param angleDescription - Technical description of the angle
 * @param lightingDescription - Technical description of the lighting effect
 * @param customPrompt - Optional user-defined creative directives
 * @param aspectRatio - Target output dimensions
 * @param faceConsistency - Boolean to enforce identity preservation
 * @param highRes - Boolean to trigger high-quality rendering logic
 */
export const transformImagePerspective = async (
  base64Image: string, 
  angleName: string, 
  lightingName: string,
  angleDescription?: string, 
  lightingDescription?: string,
  customPrompt?: string,
  aspectRatio: AspectRatio = "1:1",
  faceConsistency: boolean = false,
  highRes: boolean = false
): Promise<string> => {
  // Initialize AI right before the call to ensure the latest environment configuration is utilized.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const mainImageData = base64Image.split(',')[1] || base64Image;
  const mainMimeType = base64Image.split(';')[0].split(':')[1] || 'image/png';

  // Aspect ratio normalization for the Gemini model's specific supported values.
  let configAspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "1:1";
  if (["1:1", "3:4", "4:3", "9:16", "16:9"].includes(aspectRatio)) {
    configAspectRatio = aspectRatio as any;
  } else if (aspectRatio === "4:5") {
    configAspectRatio = "3:4"; 
  }

  const ratioInstruction = aspectRatio === "original" 
    ? "Maintain the original framing and pixel-density of the input."
    : `Output must strictly adhere to a ${aspectRatio} aspect ratio.`;

  const perspectiveInstruction = `
    ### RENDERING MANDATE: PERSPECTIVE & LIGHTING EDIT
    - **Target Angle**: "${angleName}" - ${angleDescription}
    - **Target Lighting**: "${lightingName}" - ${lightingDescription}
    - **Identity preservation**: ${faceConsistency ? "You must strictly preserve the subject's identity and facial features exactly as they appear in the source image." : "Maintain the subject's primary characteristics."}
    ${customPrompt ? `- **Additional Directives**: "${customPrompt}"` : ""}
  `;

  const qualityInstruction = highRes
    ? "RENDER MODE: Professional 8K Cinema Engine. Ensure volumetric lighting and photorealistic textures."
    : "RENDER MODE: High-fidelity professional digital photography.";

  const prompt = `You are a master-level AI Cinematographer. Your objective is to re-render the provided image from a new camera perspective and with a specific lighting atmosphere.

${perspectiveInstruction}

${qualityInstruction}

${ratioInstruction}

Final output: A single, clean, high-resolution photograph. No text overlays, no watermarks, no multi-image grids.`;

  const parts: any[] = [
    {
      inlineData: {
        data: mainImageData,
        mimeType: mainMimeType,
      },
    },
    { text: prompt }
  ];

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: configAspectRatio
        }
      }
    });

    let transformedUrl = '';
    
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          transformedUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!transformedUrl) {
      throw new Error("Render System Failure: The engine returned no image data.");
    }

    return transformedUrl;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const errorMessage = error.message || "";
    if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw new Error(error.message || "A rendering engine error occurred.");
  }
};
