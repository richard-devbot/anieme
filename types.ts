export interface UploadedImage {
  file: File;
  base64: string;
}

export interface CharacterReference {
  base64: string;
  mimeType: string;
  file?: File; // File is optional, as it won't exist for AI-generated characters
}

export interface StoryboardPanel {
  id: string;
  src: string;
  prompt: string;
}
