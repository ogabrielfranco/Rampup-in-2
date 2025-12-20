import React, { useState } from 'react';
import { UserCircle, RefreshCw } from 'lucide-react';

interface HostInputViewProps {
  onAnalyze: (hostsData: string, participantsData: string) => void;
  isLoading: boolean;
  isDarkMode: boolean;
  onBack: () => void;
}

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

const GUEST_NAMES = ["Marcos Lima", "Juliana Torres", "Rafael Castro", "Beatriz Farias", "Eduardo Dias", "Sofia Mello", "Renata Souza", "Felipe Alves"];

function generateRandomGuestData(count: number): string {
  let data = "";
  for (let i = 1; i <= count; i++) {
    const name = GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)] + " " + (i);
    const segment = STRATEGIC_SEGMENTS[Math.floor(Math.random() * STRATEGIC_SEGMENTS.length)];
    const company = `${segment.split(' ')[0]} Solutions`;
    const employees = Math.floor(Math.random() * 100) + 10;
    data += `${i}. ${name}, ${company}, ${segment}, ${employees} colaboradores\n`;
  }
  return data;
}

const HostInputView: React.FC<HostInputViewProps> = ({ onAnalyze, isLoading, onBack }) => {
  const [hostsText, setHostsText] = useState('');
  const [participantsText, setParticipantsText] = useState('');

  const handleDemo = () => {
    const hostData = "Host 1: Otacilio Valente, Colmeia, Construção Civil, 500 colaboradores\nHost 2: Nayana Branco, Somapay, Financeiro, 250 colaboradores";
    setHostsText(hostData);
    setParticipantsText(generateRandomGuestData(20));
  };

  const handleAnalyzeClick = () => {
    onAnalyze(hostsText, participantsText);
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in mb-10">
      <div className="mb-4">
        <button onClick={onBack} className="text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-widest">&larr; Voltar</button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden">
        <div className="p-8 bg-blue-600 text-white text-center">
           <UserCircle className="w-10 h-10 mx-auto mb-4" />
           <h1 className="text-2xl font-black">Análise do Host</h1>
           <p className="text-blue-100 text-xs font-medium mt-1">Sinergia focada no Anfitrião</p>
        </div>

        <div className="p-8 space-y-8">
          <div className="flex justify-end">
            <button onClick={handleDemo} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all">
              <RefreshCw className="w-3 h-3" /> Simular cenário
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
               <label className="text-[10px] font-black uppercase text-gray-400 block">Perfil do(s) Host(s)</label>
               <textarea value={hostsText} onChange={e => setHostsText(e.target.value)} className="w-full h-40 p-4 rounded-2xl border border-gray-100 bg-gray-50 text-xs font-medium outline-none focus:ring-2 ring-blue-500/10 resize-none" placeholder="Ex: Otacílio, Colmeia..." />
            </div>
            <div className="space-y-3">
               <label className="text-[10px] font-black uppercase text-gray-400 block">Lista de Convidados</label>
               <textarea value={participantsText} onChange={e => setParticipantsText(e.target.value)} className="w-full h-40 p-4 rounded-2xl border border-gray-100 bg-gray-50 text-xs font-medium outline-none focus:ring-2 ring-blue-500/10 resize-none" placeholder="Nome, Empresa, Setor..." />
            </div>
          </div>

          <button onClick={handleAnalyzeClick} disabled={!hostsText || !participantsText || isLoading} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all uppercase tracking-widest text-sm">
            Gerar Índice de Negócios
          </button>
        </div>
      </div>
    </div>
  );
};

export default HostInputView;