
import React, { useState, ChangeEvent } from 'react';
import { Upload, FileText, Play, RefreshCw, Calendar, Clock, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { LOGO_URL } from '../constants';

interface InputViewProps {
  onAnalyze: (data: string) => void;
  isLoading: boolean;
  isDarkMode: boolean;
  onBack: () => void;
}

const NAMES = ["João", "Maria", "Carlos", "Ana", "Pedro", "Lucia", "Marcos", "Fernanda", "Roberto", "Juliana", "Eduardo", "Sofia", "Rafael", "Beatriz", "Lucas", "Gabriela", "Felipe", "Renata", "Thiago", "Camila"];
const SURNAMES = ["Silva", "Souza", "Pereira", "Oliveira", "Santos", "Costa", "Lima", "Rocha", "Almeida", "Dias", "Mello", "Nunes"];

// 10 Segmentos que convergem estrategicamente
const STRATEGIC_SEGMENTS = [
  "Tecnologia (Software)",
  "Construção Civil",
  "Financeiro",
  "Marketing Digital",
  "Varejo",
  "Agronegócio",
  "Saúde",
  "Educação",
  "Logística",
  "Jurídico"
];

const COMPANIES_SUFFIX = ["Tech", "Group", "Solutions", "Consultoria", "Indústria", "Prime", "Global", "Forte", "Smart", "Plus"];

function generateRandomDemoData(count: number): string {
  let data = "Evento: Summit de Negócios Convergentes 2025\n\n";
  for (let i = 1; i <= count; i++) {
    const name = `${NAMES[Math.floor(Math.random() * NAMES.length)]} ${SURNAMES[Math.floor(Math.random() * SURNAMES.length)]}`;
    const segment = STRATEGIC_SEGMENTS[Math.floor(Math.random() * STRATEGIC_SEGMENTS.length)];
    const company = `${SURNAMES[Math.floor(Math.random() * SURNAMES.length)]} ${COMPANIES_SUFFIX[Math.floor(Math.random() * COMPANIES_SUFFIX.length)]}`;
    const employees = Math.floor(Math.random() * 500) + 1;
    data += `${i}. ${name}, ${company}, ${segment}, ${employees} colaboradores\n`;
  }
  return data;
}

const InputView: React.FC<InputViewProps> = ({ onAnalyze, isLoading, isDarkMode, onBack }) => {
  const [inputText, setInputText] = useState('');
  const [activeMethod, setActiveMethod] = useState<'paste' | 'file'>('paste');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileType = file.name.split('.').pop()?.toLowerCase();
      const reader = new FileReader();
      reader.onload = (event) => {
        if (fileType === 'xlsx' || fileType === 'xls') {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const csvText = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
          setInputText(csvText);
        } else {
          setInputText(event.target?.result as string);
        }
        setActiveMethod('paste');
      };
      if (fileType === 'xlsx' || fileType === 'xls') reader.readAsArrayBuffer(file);
      else reader.readAsText(file);
    }
  };

  const handleDemo = () => {
    const randomData = generateRandomDemoData(30);
    setEventName('Summit de Negócios 2025');
    setEventDate('2025-05-15');
    setEventTime('09:00');
    setInputText(randomData);
    setActiveMethod('paste');
  };

  const handleAnalyzeClick = () => {
    const header = `CONTEXTO: ${eventName} | Data: ${eventDate} | Hora: ${eventTime}\n\n`;
    onAnalyze(header + inputText);
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in mb-10">
      <div className="mb-4">
        <button onClick={onBack} className="text-xs font-bold text-gray-400 hover:text-emerald-600 transition-colors uppercase tracking-widest">&larr; Voltar</button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden">
        <div className="p-8 bg-emerald-600 text-white text-center">
           <img src={LOGO_URL} alt="Rampup" className="h-8 mx-auto mb-4 brightness-0 invert" />
           <h1 className="text-2xl font-black">Networking Inteligente</h1>
           <p className="text-emerald-100 text-xs font-medium mt-1">Análise Convergente por IA</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex justify-end">
            <button onClick={handleDemo} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all">
              <RefreshCw className="w-3 h-3" /> Simular Lista (10 Segmentos)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="md:col-span-1">
                <label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block">Evento</label>
                <input type="text" value={eventName} onChange={e => setEventName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-100 text-sm focus:ring-2 ring-emerald-500/10 outline-none" placeholder="Nome" />
             </div>
             <div>
                <label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block">Data</label>
                <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-100 text-sm outline-none" />
             </div>
             <div>
                <label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 block">Hora</label>
                <input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-100 text-sm outline-none" />
             </div>
          </div>

          <div className="relative">
             <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Lista de Participantes (Nome, Empresa, Setor, Colaboradores)</label>
             <textarea 
                value={inputText} 
                onChange={e => setInputText(e.target.value)}
                className="w-full h-48 p-5 rounded-2xl border border-gray-100 bg-gray-50 text-xs font-medium outline-none focus:ring-2 ring-emerald-500/10 resize-none"
                placeholder="Cole sua lista aqui..."
             />
          </div>

          <button onClick={handleAnalyzeClick} disabled={!inputText || isLoading} className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50 transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2">
            {isLoading ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Play className="w-4 h-4 fill-current" />}
            Gerar Análise Executiva
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputView;
