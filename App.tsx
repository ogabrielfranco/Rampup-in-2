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
  "Calculando sinergia estratégica...",
  "Identificando clusters setoriais...",
  "Calculando scores individuais...",
  "Formando as melhores conexões...",
  "Mapeando oportunidades de valor...",
  "Otimizando matriz de negócios..."
];

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.SELECTION);
  const [appMode, setAppMode] = useState<AppMode>('GENERAL');
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<{message: string, type: 'api' | 'data' | 'other'} | null>(null);
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
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (view === AppView.ANALYZING) {
      interval = setInterval(() => {
        setLoadingMessageIndex(Math.floor(Math.random() * LOADING_MESSAGES.length));
      }, 3000);
    }
    return () => {
      if (interval !== undefined) clearInterval(interval);
    };
  }, [view]);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      setIsKeySelected(true);
      setError(null);
    }
  };

  const handleSelectMode = (mode: AppMode) => {
    setAppMode(mode);
    setView(AppView.INPUT);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGeneralAnalyze = async (text: string) => {
    setView(AppView.ANALYZING);
    setError(null);
    try {
      const result = await analyzeNetworkingData(text);
      setResults(result);
      setView(AppView.RESULTS);
    } catch (err: any) {
      processError(err);
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
    } catch (err: any) {
      processError(err);
      setView(AppView.INPUT);
    }
  };

  const processError = (err: any) => {
    console.error("App Error Handler:", err);
    if (err.message === "CHAVE_NAO_CONFIGURADA" || err.message?.includes("entity was not found")) {
      setIsKeySelected(false);
      setError({ message: "Chave de API inválida ou ausente. Por favor, selecione uma chave ativa.", type: 'api' });
    } else if (err.message?.includes("JSON")) {
      setError({ message: "O volume de dados é muito grande ou o formato está confuso para a IA. Tente simplificar a lista.", type: 'data' });
    } else {
      setError({ message: "Falha na conexão com o motor de IA. Verifique sua internet e tente novamente.", type: 'other' });
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
    <div className={`min-h-screen font-sans transition-colors duration-300 flex flex-col ${isDarkMode ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
      <header className={`border-b sticky top-0 z-[60] backdrop-blur-md ${isDarkMode ? 'bg-chumbo-950/80 border-gray-800' : 'bg-white/80 border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={handleReset}>
            <div className={`flex items-center justify-center p-1 rounded-md h-9 transition-transform ${isDarkMode ? '' : 'bg-white'}`}>
               <img src={LOGO_URL} alt="Rampup" className={`h-full w-auto ${isDarkMode ? 'brightness-0 invert' : ''}`} />
            </div>
            <span className="text-xl font-black tracking-tighter">IN</span>
          </div>
          
          <div className="flex items-center gap-2">
            {!isKeySelected && (
              <button 
                onClick={handleSelectKey}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase shadow-md"
              >
                <Key className="w-3 h-3" /> Chave
              </button>
            )}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full transition-all ${isDarkMode ? 'bg-gray-800 text-yellow-400' : 'bg-gray-100 text-gray-600'}`}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-grow w-full flex flex-col">
        {!isKeySelected && view !== AppView.RESULTS && (
          <div className="mb-6 p-6 bg-amber-50 border border-amber-200 rounded-3xl text-center animate-fade-in">
            <h3 className="text-amber-800 font-black uppercase text-xs mb-2">Ação Requerida</h3>
            <p className="text-amber-700 text-[11px] mb-4">A análise requer uma chave de API paga do Google Cloud. Selecione-a abaixo:</p>
            <button onClick={handleSelectKey} className="px-5 py-2.5 bg-amber-600 text-white font-black rounded-xl text-xs shadow-lg">CONFIGURAR CHAVE</button>
          </div>
        )}

        {error && (
          <div className={`mb-6 p-4 border rounded-2xl flex items-start gap-3 animate-fade-in ${error.type === 'api' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs font-bold leading-relaxed">{error.message}</div>
          </div>
        )}

        {view === AppView.SELECTION && <SelectionView onSelectMode={handleSelectMode} isDarkMode={isDarkMode} />}

        {view === AppView.INPUT && (
          <div className="animate-fade-in">
            {appMode === 'GENERAL' ? (
              <InputView onAnalyze={handleGeneralAnalyze} isLoading={false} isDarkMode={isDarkMode} onBack={handleBackToSelection} />
            ) : (
              <HostInputView onAnalyze={handleHostAnalyze} isLoading={false} isDarkMode={isDarkMode} onBack={handleBackToSelection} />
            )}
          </div>
        )}

        {view === AppView.ANALYZING && (
          <div className="flex flex-col items-center justify-center pt-20 animate-fade-in text-center px-6">
            <div className="relative mb-10">
              <div className={`w-24 h-24 border-4 rounded-[2rem] animate-spin ${isDarkMode ? 'border-gray-800 border-t-verde-neon' : 'border-gray-200 border-t-emerald-600'}`}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                 <Network className={`w-8 h-8 animate-pulse ${isDarkMode ? 'text-verde-light' : 'text-emerald-600'}`} />
              </div>
            </div>
            <h2 className="text-lg font-black uppercase tracking-tighter h-12">{LOADING_MESSAGES[loadingMessageIndex]}</h2>
            <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-2">Isso pode levar até 20 segundos</p>
          </div>
        )}

        {view === AppView.RESULTS && results && <AnalysisView data={results} onReset={handleReset} isDarkMode={isDarkMode} />}
      </main>

      <footer className={`py-8 text-center border-t ${isDarkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-200'}`}>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-30">© {new Date().getFullYear()} Rampup Business Intel</p>
      </footer>
    </div>
  );
};

export default App;