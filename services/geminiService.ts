
import { GoogleGenAI } from "@google/genai";
import { AspectRatio } from "../types";

// Using the recommended flash image model for perspective transformation and editing.
const MODEL_NAME = 'gemini-2.5-flash-image';

export const transformImagePerspective = async (
  base64Image: string, 
  angleName: string, 
  lightingName: string,
  angleDescription?: string, 
  lightingDescription?: string,
  customPrompt?: string,
  aspectRatio: AspectRatio = "1:1",
  faceConsistency: boolean = false,
  highRes: boolean = false,
  poseAttireConsistency: boolean = true,
  referencePoseImage?: string | null
): Promise<string> => {
  // Always create a new instance right before the call to ensure the latest API key is used.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const mainImageData = base64Image.split(',')[1] || base64Image;
  const mainMimeType = base64Image.split(';')[0].split(':')[1] || 'image/png';

  // Supported values for gemini-2.5-flash-image: "1:1", "3:4", "4:3", "9:16", "16:9"
  let configAspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "1:1";
  if (["1:1", "3:4", "4:3", "9:16", "16:9"].includes(aspectRatio)) {
    configAspectRatio = aspectRatio as any;
  } else if (aspectRatio === "4:5") {
    configAspectRatio = "3:4"; // Closest approximation
  }

  const ratioInstruction = aspectRatio === "original" 
    ? "Maintain the original aspect ratio and framing of the input image."
    : `Adjust the composition to fit a ${aspectRatio} aspect ratio perfectly.`;

  const faceConsistencyInstruction = faceConsistency 
    ? "IDENTITY SOURCE (IMAGE 1): The face, facial features, and core character identity must be taken strictly from the FIRST image. Do not alter the subject's unique look."
    : "Maintain the subject's general identity from the FIRST image.";

  let poseAttireInstruction = "";
  if (referencePoseImage) {
    poseAttireInstruction = `
      POSE & ATTIRE SOURCE (IMAGE 2): 
      - The SECOND image is the strict reference for body posture, pose, and all clothing elements.
      - ACTION: Take the face from IMAGE 1 and place it onto the body and attire of IMAGE 2.
      - Do not keep the clothing from IMAGE 1; use ONLY the clothing and pose from IMAGE 2.
    `;
  } else {
    poseAttireInstruction = poseAttireConsistency
      ? "POSE & ATTIRE SYNC: Maintain the exact pose and clothing from the input photo while adjusting the camera angle."
      : "The model is allowed to slightly adjust the pose to suit the new camera perspective.";
  }

  const highResInstruction = highRes
    ? "ULTRA ENHANCEMENT: Render with professional cinema-grade detail. Sharpen textures, enhance lighting depth, and ensure a crisp 8K-style photorealistic finish."
    : "";

  const prompt = `You are an expert digital cinematographer performing a specialized identity and pose blend.

STUDIO SETTINGS:
- Target Camera Angle: "${angleName}" - ${angleDescription}
- Environment Lighting: "${lightingName}" - ${lightingDescription}
${customPrompt ? `- Creative Directives: "${customPrompt}"` : ''}

TECHNICAL REQUIREMENTS:
- ${ratioInstruction}
- ${faceConsistencyInstruction}
- ${poseAttireInstruction}
- ${highResInstruction}
- Blend the identity and the reference pose/attire into a single, cohesive, hyper-realistic masterpiece.
- Return the resulting composite image.`;

  const parts: any[] = [
    {
      inlineData: {
        data: mainImageData,
        mimeType: mainMimeType,
      },
    }
  ];

  if (referencePoseImage) {
    const poseData = referencePoseImage.split(',')[1] || referencePoseImage;
    const poseMime = referencePoseImage.split(';')[0].split(':')[1] || 'image/png';
    parts.push({
      inlineData: {
        data: poseData,
        mimeType: poseMime,
      },
    });
  }

  parts.push({ text: prompt });

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
      throw new Error("Render failed: The model did not return image data.");
    }

    return transformedUrl;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    const errorMessage = error.message || "";
    if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("QUOTA_EXCEEDED");
    }

    throw new Error(error.message || "An unexpected error occurred during the render.");
  }
};
