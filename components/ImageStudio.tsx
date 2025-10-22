import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { UploadedImage } from '../types';
import { UploadIcon, WandIcon, TrashIcon, PaintBrushIcon } from './IconComponents';
import Spinner from './Spinner';

// --- Helper Functions ---
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

// --- UI Components ---
const ImageUploader: React.FC<{ onImageUpload: (image: UploadedImage) => void; }> = ({ onImageUpload }) => {
  const [dragging, setDragging] = useState(false);
  const handleFileChange = async (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const base64 = await fileToBase64(file);
        onImageUpload({ file, base64 });
      } else {
        alert('Please upload a valid image file.');
      }
    }
  };
  const handleDragEvents = (e: React.DragEvent<HTMLLabelElement>, isEntering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(isEntering);
  };
  return (
    <label
      onDragEnter={(e) => handleDragEvents(e, true)}
      onDragLeave={(e) => handleDragEvents(e, false)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        handleDragEvents(e, false);
        handleFileChange(e.dataTransfer.files);
      }}
      className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ${
        dragging ? 'border-brand-primary bg-gray-700' : 'border-gray-600 bg-gray-800 hover:bg-gray-700'
      }`}
    >
      <div className="flex flex-col items-center justify-center">
        <UploadIcon className="w-8 h-8 mb-2 text-gray-500" />
        <p className="text-sm text-slate-400">
          <span className="font-semibold">Upload an image to edit</span>
        </p>
        <p className="text-xs text-slate-500">(Optional)</p>
      </div>
      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e.target.files)} />
    </label>
  );
};


const ImageStudio: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [inputImage, setInputImage] = useState<UploadedImage | null>(null);
    const [outputImage, setOutputImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const handleImageUpload = (image: UploadedImage) => {
        setInputImage(image);
        setOutputImage(null);
        setError(null);
    };
    
    const handleClearImage = () => {
        setInputImage(null);
    };

    const handleGenerate = useCallback(async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setOutputImage(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const parts = [];

            if (inputImage) {
                parts.push({ inlineData: { data: inputImage.base64, mimeType: inputImage.file.type } });
            }
            parts.push({ text: prompt });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

            if (imagePart?.inlineData) {
                setOutputImage(`data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`);
            } else {
                throw new Error('Image generation failed. The model did not return an image.');
            }
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [prompt, inputImage]);


    return (
        <div className="flex h-full bg-gray-900">
            {/* --- Control Panel --- */}
            <aside className="w-96 bg-gray-800 p-6 flex flex-col justify-between shadow-xl">
                <div>
                    <header className="flex items-center mb-6">
                        <PaintBrushIcon className="w-7 h-7 text-brand-primary" />
                        <h1 className="text-2xl font-bold ml-3">Image Studio</h1>
                    </header>
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-300 mb-2">1. Input Image (Optional)</h2>
                            {!inputImage ? (
                                <ImageUploader onImageUpload={handleImageUpload} />
                            ) : (
                                <div className="relative group">
                                    <img src={`data:${inputImage.file.type};base64,${inputImage.base64}`} alt="Input" className="rounded-lg w-full object-contain" style={{maxHeight: '150px'}} />
                                    <button onClick={handleClearImage} className="absolute top-2 right-2 p-2 bg-black bg-opacity-60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            )}
                        </div>
                        <div>
                             <h2 className="text-lg font-semibold text-slate-300 mb-2">2. Prompt</h2>
                             <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={inputImage ? "Describe the changes you want to make..." : "Describe the image you want to create..."}
                                rows={6}
                                disabled={isLoading}
                                className="w-full p-3 bg-gray-700 border border-gray-600 text-slate-200 rounded-md focus:ring-2 focus:ring-brand-primary focus:border-transparent transition disabled:opacity-50"
                            />
                        </div>
                    </div>
                </div>
                <div className="mt-6">
                    <button
                        onClick={handleGenerate}
                        disabled={!prompt || isLoading}
                        className="w-full bg-brand-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-brand-primary transition-transform duration-150 ease-in-out active:scale-95 disabled:bg-gray-600 disabled:cursor-wait flex items-center justify-center"
                    >
                        {isLoading ? <Spinner /> : <><WandIcon className="w-5 h-5 mr-2" /> Generate Image</>}
                    </button>
                    {error && <p className="text-sm text-red-400 bg-red-900 bg-opacity-30 p-3 rounded-md mt-4">{error}</p>}
                </div>
            </aside>
            {/* --- Display Area --- */}
            <main className="flex-1 p-8 flex items-center justify-center bg-gray-900">
                <div className="w-full h-full max-w-4xl max-h-4xl flex items-center justify-center">
                    {isLoading ? (
                         <div className="text-center">
                            <Spinner />
                            <p className="mt-4 text-slate-400">Generating your vision...</p>
                         </div>
                    ) : outputImage ? (
                        <img src={outputImage} alt="Generated output" className="rounded-lg shadow-2xl object-contain max-w-full max-h-full animate-fade-in" />
                    ) : (
                        <div className="text-center text-gray-600 p-12 border-2 border-dashed border-gray-700 rounded-lg">
                           <PaintBrushIcon className="w-24 h-24 mx-auto mb-4" />
                           <h2 className="text-2xl font-semibold text-slate-400">Your generated image will appear here</h2>
                           <p className="mt-2 max-w-md">Write a prompt, optionally add an image, and click generate.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default ImageStudio;