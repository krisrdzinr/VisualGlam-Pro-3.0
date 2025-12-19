
export interface ImageState {
  original: string | null;
  referencePose: string | null;
  transformed: string[] | null;
  loading: boolean;
  error: string | null;
}

export interface AngleDefinition {
  name: string;
  description: string;
  bestUse: string;
}

export interface LightingDefinition {
  name: string;
  description: string;
  effect: string;
}

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | "original" | "4:5";

export interface Category {
  title: string;
  angles: AngleDefinition[];
}

export interface LightingCategory {
  title: string;
  presets: LightingDefinition[];
}

export interface TransformationRequest {
  image: string;
  prompt: string;
}
