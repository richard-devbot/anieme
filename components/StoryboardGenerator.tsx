import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { CharacterReference, StoryboardPanel, UploadedImage } from '../types';
import { UploadIcon, WandIcon, FilmIcon, TrashIcon, UserIcon, SparklesIcon } from './IconComponents';
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
interface CharacterUploaderProps {
  onImageUpload: (image: UploadedImage) => void;
}

const CharacterUploader: React.FC<CharacterUploaderProps> = ({ onImageUpload }) => {
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
    <div className="w-full">
      <label
        onDragEnter={(e) => handleDragEvents(e, true)}
        onDragLeave={(e) => handleDragEvents(e, false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          handleDragEvents(e, false);
          handleFileChange(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ${
          dragging ? 'border-brand-primary bg-gray-700' : 'border-gray-600 bg-gray-800 hover:bg-gray-700'
        }`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
          <UploadIcon className="w-8 h-8 mb-3 text-gray-500" />
          <p className="mb-2 text-sm text-slate-300">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-slate-400">Character Reference Image</p>
        </div>
        <input id="dropzone-file" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e.target.files)} />
      </label>
    </div>
  );
};


const StoryboardGenerator: React.FC = () => {
  const [character, setCharacter] = useState<CharacterReference | null>(null);
  const [characterCreationMode, setCharacterCreationMode] = useState<'upload' | 'describe'>('upload');
  const [characterDescription, setCharacterDescription] = useState('');
  const [isCreatingCharacter, setIsCreatingCharacter] = useState(false);
  
  const [script, setScript] = useState('');
  const [storyboard, setStoryboard] = useState<StoryboardPanel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (image: UploadedImage) => {
    setCharacter({
        base64: image.base64,
        mimeType: image.file.type,
        file: image.file,
    });
    setStoryboard([]);
    setError(null);
  };
  
  const handleClearCharacter = () => {
    setCharacter(null);
    setStoryboard([]);
    setCharacterDescription('');
  };

  const handleCreateCharacter = useCallback(async () => {
    if (!characterDescription.trim()) {
        setError('Please describe the character you want to create.');
        return;
    }
    setIsCreatingCharacter(true);
    setError(null);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const prompt = `Create a character reference sheet for an anime character. The character is: ${characterDescription}. The background should be a neutral gray. The character should be in a full-body standing pose, facing forward. High quality, clean line art, vibrant colors.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

        if (imagePart?.inlineData) {
            setCharacter({
                base64: imagePart.inlineData.data,
                mimeType: imagePart.inlineData.mimeType,
            });
            setStoryboard([]);
        } else {
            throw new Error("The AI failed to generate a character. Please try again.");
        }
    } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'An unknown error occurred while creating the character.');
    } finally {
        setIsCreatingCharacter(false);
    }
  }, [characterDescription]);

  const handleGenerate = useCallback(async () => {
    if (!character) {
      setError('Please upload or create a character reference image.');
      return;
    }
    if (!script.trim()) {
        setError('Please enter a script for the storyboard.');
        return;
    }

    setIsLoading(true);
    setError(null);
    setStoryboard([]);

    const scriptLines = script.trim().split('\n').filter(line => line.trim() !== '');
    const newPanels: StoryboardPanel[] = [];
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      
      for (const line of scriptLines) {
        setStoryboard(prev => [...prev, { id: `loading-${prev.length}`, src: '', prompt: 'loading' }]);
        
        const [sceneDescription, textContent] = line.split('|').map(s => s.trim());

        let fullPrompt = `Create a dynamic anime panel in a modern style, ensuring the character's appearance is consistent with the provided reference image. The scene is: '${sceneDescription}'. Use interesting camera angles and cinematic composition.`;

        if (textContent) {
            fullPrompt += `\n\nIMPORTANT: Render the following text clearly inside the panel, using a stylish comic book font inside a speech bubble or caption box appropriate for the scene: "${textContent}"`;
        }
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: character.base64, mimeType: character.mimeType } },
                    { text: fullPrompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

        if (imagePart?.inlineData) {
            newPanels.push({
                id: `${new Date().toISOString()}-${Math.random()}`,
                src: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
                prompt: line,
            });
        } else {
            newPanels.push({
              id: `${new Date().toISOString()}-${Math.random()}`,
              src: 'error',
              prompt: line,
            });
        }
        setStoryboard([...newPanels]);
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred during generation.');
    } finally {
      setIsLoading(false);
    }
  }, [character, script]);
  
  const ModeButton: React.FC<{
    mode: 'upload' | 'describe';
    label: string;
    icon: React.ReactNode;
  }> = ({ mode, label, icon }) => (
    <button
      onClick={() => setCharacterCreationMode(mode)}
      className={`flex-1 flex items-center justify-center p-2 text-sm font-medium rounded-md transition-colors ${
        characterCreationMode === mode
          ? 'bg-brand-primary text-white'
          : 'bg-gray-700 text-slate-300 hover:bg-gray-600'
      }`}
    >
      {icon}
      <span className="ml-2">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col md:flex-row h-full bg-gray-900">
      {/* --- Control Panel --- */}
      <aside className="w-full md:w-96 bg-gray-800 p-6 shadow-2xl flex-shrink-0 flex flex-col">
        <header className="flex items-center mb-6">
          <FilmIcon className="w-8 h-8 text-brand-primary" />
          <h1 className="text-2xl font-bold text-slate-100 ml-3">Storyboard AI</h1>
        </header>
        
        <div className="space-y-6 flex-1 overflow-y-auto pr-2">
          {/* Step 1: Character */}
          <div>
            <h2 className="text-lg font-semibold text-slate-300 mb-2 flex items-center">
                <UserIcon className="w-5 h-5 mr-2" />1. Set Your Character
            </h2>
            {!character ? (
               <div>
                  <div className="flex items-center gap-2 mb-4 p-1 bg-gray-900 rounded-lg">
                    <ModeButton mode="upload" label="Upload" icon={<UploadIcon className="w-4 h-4" />} />
                    <ModeButton mode="describe" label="Describe" icon={<SparklesIcon className="w-4 h-4" />} />
                  </div>
                  {characterCreationMode === 'upload' ? (
                      <CharacterUploader onImageUpload={handleImageUpload} />
                  ) : (
                      <div className="space-y-3">
                          <textarea
                            value={characterDescription}
                            onChange={(e) => setCharacterDescription(e.target.value)}
                            placeholder="e.g., A young male ninja with spiky silver hair, a red scarf, and a confident smirk..."
                            rows={4}
                            disabled={isCreatingCharacter}
                            className="w-full p-3 bg-gray-700 border border-gray-600 text-slate-200 rounded-md focus:ring-2 focus:ring-brand-primary focus:border-transparent transition disabled:opacity-50"
                          />
                          <button
                            onClick={handleCreateCharacter}
                            disabled={!characterDescription || isCreatingCharacter}
                            className="w-full bg-pink-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-pink-500 transition-transform duration-150 ease-in-out active:scale-95 disabled:bg-gray-600 disabled:cursor-wait flex items-center justify-center"
                          >
                            {isCreatingCharacter ? <Spinner /> : <><SparklesIcon className="w-5 h-5 mr-2" /> Generate Character</>}
                          </button>
                      </div>
                  )}
               </div>
            ) : (
                <div className="relative group">
                    <img src={`data:${character.mimeType};base64,${character.base64}`} alt="Character Reference" className="w-full h-auto rounded-lg object-contain" style={{maxHeight: '200px'}}/>
                    <button onClick={handleClearCharacter} className="absolute top-2 right-2 p-2 bg-black bg-opacity-60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <TrashIcon className="w-5 h-5"/>
                    </button>
                </div>
            )}
             {isCreatingCharacter && !character && (
                <div className="flex flex-col items-center justify-center h-40">
                  <Spinner />
                  <p className="text-sm text-slate-400 mt-2">Creating your character...</p>
                </div>
              )}
          </div>

          {/* Step 2: Script */}
          <div>
            <h2 className="text-lg font-semibold text-slate-300 mb-2">2. Write Your Script</h2>
             <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder={`Use the format: [SCENE] | [TEXT]\n\nExample:\nLooking out a rainy window. | It's been raining for days...\nA mysterious figure appears. | "Who's there?!"`}
                rows={8}
                disabled={isLoading}
                className="w-full p-3 bg-gray-700 border border-gray-600 text-slate-200 rounded-md focus:ring-2 focus:ring-brand-primary focus:border-transparent transition disabled:opacity-50"
            />
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-6 pt-6 border-t border-gray-700">
            <button
                onClick={handleGenerate}
                disabled={!character || !script || isLoading}
                className="w-full bg-brand-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-brand-primary transition-transform duration-150 ease-in-out active:scale-95 disabled:bg-gray-600 disabled:cursor-wait flex items-center justify-center"
            >
                {isLoading ? <Spinner /> : <><WandIcon className="w-5 h-5 mr-2" /> Generate Storyboard</>}
            </button>
            {error && <p className="text-sm text-red-400 bg-red-900 bg-opacity-30 p-3 rounded-md mt-4">{error}</p>}
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="flex-1 p-8 bg-gray-900 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
            {storyboard.length === 0 && !isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-600 rounded-lg border-2 border-dashed border-gray-700 p-12">
                    <FilmIcon className="w-24 h-24 mb-4" />
                    <h2 className="text-2xl font-semibold text-slate-300">Your storyboard will appear here</h2>
                    <p className="mt-2 max-w-md">Create a character, write a script, and let the AI bring your story to life.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                  {storyboard.map((panel, index) => (
                      <div key={panel.id} className="bg-gray-800 rounded-lg shadow-lg overflow-hidden group animate-fade-in">
                          <div className="w-full h-64 bg-gray-700 flex items-center justify-center">
                            {panel.prompt === 'loading' ? (
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto"></div>
                                    <p className="text-sm mt-2 text-slate-400">Generating Panel {index + 1}...</p>
                                </div>
                            ) : panel.src === 'error' ? (
                                <div className="text-center text-red-400 p-4">
                                    <p>Failed to generate panel.</p>
                                </div>
                            ) : (
                                <img src={panel.src} alt={panel.prompt} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="p-4 bg-gray-800">
                              <p className="text-sm font-semibold text-brand-primary">Panel {index + 1}</p>
                              <p className="text-xs text-slate-400 mt-1 truncate" title={panel.prompt}>{panel.prompt}</p>
                          </div>
                      </div>
                  ))}
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default StoryboardGenerator;