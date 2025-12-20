
import React, { useState, useEffect } from 'react';
import InputView from './components/InputView';
import SelectionView from './components/SelectionView';
import HostInputView from './components/HostInputView';
import AnalysisView from './components/AnalysisView';
import { analyzeNetworkingData, analyzeHostPotential } from './services/geminiService';
import { AnalysisResult, AppView, AppMode } from './types';
import { Network, Moon, Sun, AlertCircle } from 'lucide-react';
import { LOGO_URL } from './constants';

const LOADING_MESSAGES = [
  "Conectando ecossistemas...",
  "Calculando Índice de Negócio...",
  "Mapeando sinergias...",
  "Otimizando mesas...",
  "Inteligência Rampup ativada..."
];

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.SELECTION);
  const [appMode, setAppMode] = useState<AppMode>('GENERAL');
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    let interval: any;
    if (view === AppView.ANALYZING) {
      interval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [view]);

  const handleRunAnalysis = async (action: () => Promise<AnalysisResult>) => {
    setView(AppView.ANALYZING);
    setError(null);
    try {
      const result = await action();
      setResults(result);
      setView(AppView.RESULTS);
    } catch (err: any) {
      console.error("Analysis Error:", err);
      setError("Erro na análise. Verifique se os dados estão corretos e se há conexão com a internet.");
      setView(AppView.INPUT);
    }
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col transition-colors duration-500 ${isDarkMode ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
      <header className={`border-b sticky top-0 z-50 backdrop-blur-md transition-colors ${isDarkMode ? 'bg-chumbo-950/90 border-gray-800' : 'bg-white/90 border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView(AppView.SELECTION)}>
            <img src={LOGO_URL} alt="Rampup" className={`h-7 transition-all ${isDarkMode ? 'brightness-0 invert' : ''}`} />
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-800"></div>
            <span className="font-black text-xl tracking-tighter">IN</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-full transition-all active:scale-90 ${isDarkMode ? 'bg-gray-800 text-yellow-400' : 'bg-gray-100 text-gray-600'}`}>
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 flex-grow w-full">
        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 rounded-2xl flex items-center gap-3 animate-slide-up">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        )}

        {view === AppView.SELECTION && <SelectionView onSelectMode={(m) => { setAppMode(m); setView(AppView.INPUT); }} isDarkMode={isDarkMode} />}
        
        {view === AppView.INPUT && (
          <div className="animate-fade-in">
            {appMode === 'GENERAL' 
              ? <InputView onAnalyze={(d) => handleRunAnalysis(() => analyzeNetworkingData(d))} isLoading={false} isDarkMode={isDarkMode} onBack={() => setView(AppView.SELECTION)} />
              : <HostInputView onAnalyze={(h, p) => handleRunAnalysis(() => analyzeHostPotential(h, p))} isLoading={false} isDarkMode={isDarkMode} onBack={() => setView(AppView.SELECTION)} />
            }
          </div>
        )}

        {view === AppView.ANALYZING && (
          <div className="flex flex-col items-center justify-center pt-24 text-center">
            <div className="relative mb-12">
               <div className={`w-24 h-24 border-4 rounded-[2.5rem] animate-spin ${isDarkMode ? 'border-gray-800 border-t-verde-neon' : 'border-gray-100 border-t-emerald-600'}`}></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <Network className={`w-8 h-8 animate-pulse ${isDarkMode ? 'text-verde-light' : 'text-emerald-600'}`} />
               </div>
            </div>
            <h2 className="text-xl font-black uppercase tracking-tighter mb-2">{LOADING_MESSAGES[loadingMessageIndex]}</h2>
            <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.3em]">IA em tempo real</p>
          </div>
        )}

        {view === AppView.RESULTS && results && (
          <div className="animate-fade-in">
            <AnalysisView data={results} onReset={() => setView(AppView.SELECTION)} isDarkMode={isDarkMode} />
          </div>
        )}
      </main>

      <footer className="py-10 text-center opacity-20 hover:opacity-100 transition-opacity">
        <p className="text-[9px] font-black uppercase tracking-[0.4em]">© {new Date().getFullYear()} Rampup Business Intelligence</p>
      </footer>
    </div>
  );
};

export default App;
