
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
    ? "IDENTITY PRESERVATION: The subject's face must remain exactly as it is in the FIRST image provided. Do not modify facial features, skin texture, or unique identifiers."
    : "";

  let poseAttireInstruction = "";
  if (referencePoseImage) {
    poseAttireInstruction = `
      POSE & ATTIRE TRANSFER: 
      - Use the SECOND image provided as the strict source for POSE and ATTIRE.
      - The subject from the FIRST image (the face/identity) must be placed into the EXACT pose and wearing the EXACT clothing (style, color, fabric) shown in the SECOND image.
      - Blend the identity of image 1 seamlessly onto the body and outfit of image 2.
    `;
  } else {
    poseAttireInstruction = poseAttireConsistency
      ? "POSE & ATTIRE SYNC: You must keep the exact pose, body posture, and all clothing elements from the original photo. Only re-render the camera angle and lighting around the subject."
      : "The model is allowed to slightly adjust the pose to better suit the new camera angle while keeping the general character appearance.";
  }

  const highResInstruction = highRes
    ? `ULTRA ENHANCEMENT: Perform a master upscale to 8K UHD quality across the entire result. Enhance every texture, including skin, hair, and clothing, to a photorealistic standard. Remove noise and blur. The final render must look like a high-end RAW cinematic frame with volumetric lighting, crisp edges, and HDR-level depth and clarity.`
    : "";

  const prompt = `You are a world-class digital cinematographer. Re-imagine the attached subject(s) based on these professional studio settings:

CORE PERSPECTIVE:
- Camera Angle: "${angleName}" - ${angleDescription || 'Adjust the 3D perspective to match this angle.'}
- Lighting & Atmosphere: "${lightingName}" - ${lightingDescription || 'Apply this lighting to the whole scene.'}
${customPrompt ? `- Creative Directives: "${customPrompt}"` : ''}

TECHNICAL REQUIREMENTS:
- ${ratioInstruction}
- ${faceConsistencyInstruction}
- ${poseAttireInstruction}
- ${highResInstruction}
- Maintain the subject's core character identity from image 1.
- Return the transformed image as the primary output.`;

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
      throw new Error("Transformation failed: No image data returned by the model.");
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
