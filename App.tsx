import React, { useState } from 'react';
import { FilmIcon, PaintBrushIcon } from './components/IconComponents';
import StoryboardGenerator from './components/StoryboardGenerator';
import ImageStudio from './components/ImageStudio';

type Tool = 'imageStudio' | 'storyboard';

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool>('imageStudio');

  const NavItem: React.FC<{
    tool: Tool;
    label: string;
    icon: React.ReactNode;
  }> = ({ tool, label, icon }) => (
    <li>
      <button
        onClick={() => setActiveTool(tool)}
        className={`flex items-center p-3 w-full text-sm font-medium rounded-lg group transition-colors duration-200 ${
          activeTool === tool
            ? 'bg-brand-primary text-white shadow-lg'
            : 'text-slate-300 hover:bg-gray-700'
        }`}
      >
        {icon}
        <span className="ml-3">{label}</span>
      </button>
    </li>
  );

  return (
    <div className="flex h-screen bg-gray-900 text-slate-200">
      {/* --- Sidebar Navigation --- */}
      <aside className="w-64 flex-shrink-0 bg-gray-800 p-4 shadow-lg flex flex-col">
        <header className="flex items-center pb-4 mb-4 border-b border-gray-700">
          <svg className="w-8 h-8 text-brand-primary" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 0L93.3 25V75L50 100L6.7 75V25L50 0Z" fill="currentColor"/>
            <path d="M50 12.5L82.475 29.6875V70.3125L50 87.5L17.525 70.3125V29.6875L50 12.5Z" stroke="white" strokeWidth="5"/>
          </svg>
          <h1 className="text-xl font-bold ml-3">Creative Suite</h1>
        </header>
        <nav className="flex-1">
          <ul className="space-y-2">
            <NavItem 
              tool="imageStudio" 
              label="Image Studio" 
              icon={<PaintBrushIcon className="w-6 h-6" />}
            />
            <NavItem 
              tool="storyboard" 
              label="Storyboard AI" 
              icon={<FilmIcon className="w-6 h-6" />}
            />
          </ul>
        </nav>
        <footer className="text-xs text-center text-gray-500">
            <p>Powered by Gemini</p>
        </footer>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="flex-1 overflow-hidden">
        {activeTool === 'imageStudio' && <ImageStudio />}
        {activeTool === 'storyboard' && <StoryboardGenerator />}
      </main>
    </div>
  );
};

export default App;
