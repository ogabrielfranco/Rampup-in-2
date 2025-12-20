
import React, { useState, useEffect } from 'react';
import InputView from './components/InputView';
import SelectionView from './components/SelectionView';
import HostInputView from './components/HostInputView';
import AnalysisView from './components/AnalysisView';
import { analyzeNetworkingData, analyzeHostPotential } from './services/geminiService';
import { AnalysisResult, AppView, AppMode } from './types';
import { Network, Moon, Sun, Key, AlertTriangle } from 'lucide-react';
import { LOGO_URL } from './constants';

const LOADING_MESSAGES = [
  "Conectando ecossistemas...",
  "Calculando Índice de Negócio...",
  "Mapeando sinergias estratégicas...",
  "Organizando mesas de alto valor...",
  "Processando inteligência Rampup..."
];

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.SELECTION);
  const [appMode, setAppMode] = useState<AppMode>('GENERAL');
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [isKeySelected, setIsKeySelected] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        setIsKeySelected(hasKey);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    let interval: any;
    if (view === AppView.ANALYZING) {
      interval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [view]);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      setIsKeySelected(true);
      setError(null);
    }
  };

  const handleAnalyze = async (fn: () => Promise<AnalysisResult>) => {
    setView(AppView.ANALYZING);
    setError(null);
    try {
      const result = await fn();
      setResults(result);
      setView(AppView.RESULTS);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found") || err.message === "API_KEY_MISSING") {
        setIsKeySelected(false);
        setError("Chave de API inválida ou sem permissão. Por favor, selecione uma chave válida.");
      } else {
        setError("Erro ao processar análise. Tente novamente com menos dados.");
      }
      setView(AppView.INPUT);
    }
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col transition-colors duration-300 ${isDarkMode ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
      <header className={`border-b sticky top-0 z-50 backdrop-blur-md ${isDarkMode ? 'bg-chumbo-950/80 border-gray-800' : 'bg-white/80 border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView(AppView.SELECTION)}>
            <img src={LOGO_URL} alt="Logo" className={`h-8 ${isDarkMode ? 'brightness-0 invert' : ''}`} />
            <span className="font-black text-xl tracking-tighter">IN</span>
          </div>
          <div className="flex items-center gap-2">
            {!isKeySelected && (
              <button onClick={handleSelectKey} className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase"><Key className="w-3 h-3 inline mr-1" /> Chave</button>
            )}
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-800 text-yellow-400' : 'bg-gray-100 text-gray-600'}`}>
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 flex-grow w-full">
        {!isKeySelected && view !== AppView.RESULTS && (
          <div className="mb-6 p-6 bg-amber-50 border border-amber-200 rounded-3xl text-center">
            <h3 className="text-amber-800 font-black uppercase text-xs mb-2">Chave de API Requerida</h3>
            <p className="text-amber-700 text-[11px] mb-4">Selecione uma chave Gemini para continuar (Camada Gratuita disponível).</p>
            <button onClick={handleSelectKey} className="px-6 py-2.5 bg-amber-600 text-white font-black rounded-xl text-xs">CONFIGURAR AGORA</button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        )}

        {view === AppView.SELECTION && <SelectionView onSelectMode={(m) => { setAppMode(m); setView(AppView.INPUT); }} isDarkMode={isDarkMode} />}
        
        {view === AppView.INPUT && (
          appMode === 'GENERAL' 
            ? <InputView onAnalyze={(d) => handleAnalyze(() => analyzeNetworkingData(d))} isLoading={false} isDarkMode={isDarkMode} onBack={() => setView(AppView.SELECTION)} />
            : <HostInputView onAnalyze={(h, p) => handleAnalyze(() => analyzeHostPotential(h, p))} isLoading={false} isDarkMode={isDarkMode} onBack={() => setView(AppView.SELECTION)} />
        )}

        {view === AppView.ANALYZING && (
          <div className="flex flex-col items-center justify-center pt-20 text-center animate-pulse">
            <div className={`w-20 h-20 border-4 rounded-3xl animate-spin mb-8 ${isDarkMode ? 'border-gray-800 border-t-verde-neon' : 'border-gray-200 border-t-emerald-600'}`}></div>
            <h2 className="text-lg font-black uppercase tracking-tighter">{LOADING_MESSAGES[loadingMessageIndex]}</h2>
          </div>
        )}

        {view === AppView.RESULTS && results && <AnalysisView data={results} onReset={() => setView(AppView.SELECTION)} isDarkMode={isDarkMode} />}
      </main>

      <footer className="py-8 text-center opacity-30 text-[10px] font-black uppercase tracking-widest">
        © {new Date().getFullYear()} Rampup Business Intel
      </footer>
    </div>
  );
};

export default App;
