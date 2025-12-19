
import React, { useState, useEffect } from 'react';
import InputView from './components/InputView';
import SelectionView from './components/SelectionView';
import HostInputView from './components/HostInputView';
import AnalysisView from './components/AnalysisView';
import { analyzeNetworkingData, analyzeHostPotential } from './services/geminiService';
import { AnalysisResult, AppView, AppMode } from './types';
import { Network, Moon, Sun } from 'lucide-react';

const LOADING_MESSAGES = [
  "Calculando sinergia estratégica...",
  "Identificando clusters setoriais...",
  "Calculando scores individuais...",
  "Formando as melhores conexões...",
  "Mapeando oportunidades de valor...",
  "Otimizando matriz de negócios..."
];

export const LOGO_URL = "https://lh3.googleusercontent.com/pw/AP1GczMP2TMLrL7jJinfgjlYoQwz5k6p6fQNHEo6tdX1nN_Wo1jId1OkfiTaNAPpXGRYUElU2dT2QaGtOXciVla2W1-wRRqNBGiYSIPbMuSKlgiaalAGG0dlo96PIPo6hqD5LTPYdRWZepZJIdyXpokc6lsJ=w969-h387-s-no-gm?authuser=0";

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.SELECTION);
  const [appMode, setAppMode] = useState<AppMode>('GENERAL');
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (view === AppView.ANALYZING) {
      setLoadingMessageIndex(Math.floor(Math.random() * LOADING_MESSAGES.length));
      
      interval = setInterval(() => {
        setLoadingMessageIndex((prev) => {
          let next = Math.floor(Math.random() * LOADING_MESSAGES.length);
          while (next === prev && LOADING_MESSAGES.length > 1) {
             next = Math.floor(Math.random() * LOADING_MESSAGES.length);
          }
          return next;
        });
      }, 2500);
    }
    return () => {
      if (interval !== undefined) clearInterval(interval);
    };
  }, [view]);

  const handleSelectMode = (mode: AppMode) => {
    setAppMode(mode);
    setView(AppView.INPUT);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGeneralAnalyze = async (text: string) => {
    setView(AppView.ANALYZING);
    setError(null);
    try {
      const result = await analyzeNetworkingData(text);
      setResults(result);
      setView(AppView.RESULTS);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error(err);
      setError("Falha ao analisar os dados. Verifique sua conexão e tente novamente.");
      setView(AppView.INPUT);
    }
  };

  const handleHostAnalyze = async (hostsData: string, participantsData: string) => {
    setView(AppView.ANALYZING);
    setError(null);
    try {
      const result = await analyzeHostPotential(hostsData, participantsData);
      setResults(result);
      setView(AppView.RESULTS);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error(err);
      setError("Falha ao analisar os dados do Host. Tente novamente.");
      setView(AppView.INPUT);
    }
  };

  const handleReset = () => {
    setResults(null);
    setView(AppView.SELECTION);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToSelection = () => {
    setView(AppView.SELECTION);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 flex flex-col ${isDarkMode ? 'bg-black text-white selection:bg-verde-neon selection:text-black' : 'bg-gray-50 text-gray-900 selection:bg-emerald-100'}`}>
      <header className={`border-b sticky top-0 z-[60] transition-colors duration-300 backdrop-blur-md ${isDarkMode ? 'bg-chumbo-950/80 border-gray-800' : 'bg-white/80 border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView(AppView.SELECTION)}>
            <div className={`flex items-center justify-center p-1 rounded-md h-9 md:h-10 w-auto transition-transform group-hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-transparent' : 'bg-white'}`}>
               <img 
                 src={LOGO_URL} 
                 alt="Rampup Business" 
                 className={`h-full w-auto object-contain transition-all ${isDarkMode ? 'brightness-0 invert' : ''}`} 
               />
            </div>
            <div className={`h-6 w-px ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
            <span className={`text-lg md:text-xl font-black tracking-tighter bg-clip-text text-transparent ${isDarkMode ? 'bg-gradient-to-r from-white to-gray-500' : 'bg-gradient-to-r from-gray-900 to-gray-500'}`}>
              IN
            </span>
          </div>
          
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2.5 rounded-full transition-all active:scale-90 ${isDarkMode ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {isDarkMode ? <Sun className="h-4 md:h-5 w-4 md:w-5" /> : <Moon className="h-4 md:h-5 w-4 md:w-5" />}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 flex-grow w-full flex flex-col">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-2xl flex items-center animate-fade-in">
            <span className="mr-3 text-lg">⚠️</span> 
            <span className="text-sm font-bold">{error}</span>
          </div>
        )}

        {view === AppView.SELECTION && (
           <SelectionView onSelectMode={handleSelectMode} isDarkMode={isDarkMode} />
        )}

        {view === AppView.INPUT && (
          <div className="animate-fade-in">
            {appMode === 'GENERAL' ? (
              <InputView 
                onAnalyze={handleGeneralAnalyze} 
                isLoading={false} 
                isDarkMode={isDarkMode} 
                onBack={handleBackToSelection}
              />
            ) : (
              <HostInputView 
                onAnalyze={handleHostAnalyze} 
                isLoading={false} 
                isDarkMode={isDarkMode} 
                onBack={handleBackToSelection}
              />
            )}
          </div>
        )}

        {view === AppView.ANALYZING && (
          <div className="flex flex-col items-center justify-center pt-20 animate-fade-in text-center px-6">
            <div className="relative mb-10">
              <div className={`w-28 h-28 border-4 rounded-[2.5rem] animate-spin ${isDarkMode ? 'border-gray-800 border-t-verde-neon' : 'border-gray-200 border-t-emerald-600'}`}></div>
              <div className={`absolute top-0 left-0 w-28 h-28 border-4 rounded-[2.5rem] animate-pulse border-transparent ${isDarkMode ? 'border-b-verde-light' : 'border-b-emerald-400'}`}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                 <Network className={`w-10 h-10 animate-pulse ${isDarkMode ? 'text-verde-light' : 'text-emerald-600'}`} />
              </div>
            </div>
            
            <div className="h-20 flex items-center justify-center max-w-sm mx-auto">
               <h2 key={loadingMessageIndex} className={`text-xl md:text-2xl font-black uppercase tracking-tighter leading-tight animate-fade-in ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                 {LOADING_MESSAGES[loadingMessageIndex]}
               </h2>
            </div>
            <p className={`mt-4 text-sm font-bold opacity-40 uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Processamento de IA em tempo real</p>
          </div>
        )}

        {view === AppView.RESULTS && results && (
          <AnalysisView data={results} onReset={handleReset} isDarkMode={isDarkMode} />
        )}
      </main>

      <footer className={`py-10 text-center border-t transition-colors ${isDarkMode ? 'bg-chumbo-950 border-gray-800' : 'bg-white border-gray-200 shadow-inner'}`}>
        <div className="flex flex-col items-center justify-center gap-4">
           <img 
             src={LOGO_URL} 
             alt="Rampup Business" 
             className={`h-8 opacity-60 hover:opacity-100 transition-all cursor-pointer hover:scale-105 ${isDarkMode ? 'brightness-0 invert' : 'grayscale hover:grayscale-0'}`} 
           />
           <div className="space-y-1">
             <p className={`text-[10px] md:text-xs font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
               Powered by Rampup Business Intel
             </p>
             <p className={`text-[9px] font-bold opacity-30 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
               © {new Date().getFullYear()} • Strategic Networking Intelligence
             </p>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
