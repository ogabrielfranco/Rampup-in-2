
import React, { useState, useMemo, useDeferredValue, useRef } from 'react';
import { AnalysisResult, Participant, LayoutFormat, IndividualScore } from '../types';
import SeatingView from './SeatingView';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
  Users, TrendingUp, ArrowLeft, ArrowRight, FileSpreadsheet, Search, 
  X, LayoutTemplate, Crown, ChevronRight, FileText, Presentation, 
  Zap, FileDown, Target, Briefcase, Award, Monitor
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import pptxgen from 'pptxgenjs';
import { LOGO_URL } from '../constants';

interface AnalysisViewProps {
  data: AnalysisResult;
  onReset: () => void;
  isDarkMode: boolean;
}

const formatLayoutName = (layout: string) => {
  const map: Record<string, string> = {
    'teatro': 'Teatro', 'sala_aula': 'Sala de Aula', 'mesa_o': 'Mesa em O',
    'conferencia': 'Conferência', 'mesa_u': 'Mesa em U', 'mesa_t': 'Mesa em T',
    'recepcao': 'Recepção', 'buffet': 'Buffet', 'custom': 'Livre'
  };
  return map[layout] || layout;
};

// Componente de Linha de Participante com Expansão de Conexões
const ParticipantRow: React.FC<{
  item: { p: Participant; score: IndividualScore };
  isExpanded: boolean;
  onToggle: () => void;
  participantMap: Map<string, Participant>;
  isDarkMode: boolean;
}> = ({ item, isExpanded, onToggle, participantMap, isDarkMode }) => {
  return (
    <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
      isExpanded 
        ? 'border-emerald-500 shadow-lg ring-1 ring-emerald-500/20' 
        : isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-white hover:border-emerald-200'
    } shadow-sm`}>
      <div 
        onClick={onToggle}
        className="p-4 md:p-5 cursor-pointer flex items-center gap-3 md:gap-4 active:bg-gray-50 dark:active:bg-gray-800 select-none"
      >
        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex flex-col items-center justify-center shadow-sm shrink-0 border ${
          isDarkMode ? 'bg-gray-800 border-gray-700 text-verde-neon' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
        }`}>
          <span className="text-lg md:text-xl font-black leading-none">{item.score.score}</span>
          <span className="text-[6px] md:text-[7px] font-black uppercase opacity-60 mt-0.5 tracking-tighter">Índice IN</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-bold text-sm md:text-base flex items-center gap-2 truncate ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            {item.p.name} {item.p.isHost && <Crown className="w-3 md:w-4 h-3 md:h-4 text-amber-500 fill-amber-500" />}
          </h4>
          <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
            {item.p.company} • {item.p.segment}
          </p>
        </div>
        <ChevronRight className={`w-4 md:w-5 h-4 md:h-5 text-gray-300 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-emerald-500' : ''}`} />
      </div>
      
      {isExpanded && (
        <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50/50'} border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} p-4 md:p-6 animate-fade-in`}>
          <div className="flex items-center gap-2 mb-4">
             <Target className="w-3 md:w-4 h-3 md:h-4 text-emerald-600" />
             <h5 className="text-[10px] md:text-[11px] font-black uppercase text-emerald-700 dark:text-verde-light tracking-widest">Sinergias Estratégicas</h5>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {item.score.recommendedConnections?.map((conn, idx) => {
              const partner = participantMap.get(conn.partnerId);
              if (!partner) return null;
              return (
                <div key={idx} className={`p-3 md:p-4 rounded-xl border flex justify-between items-center shadow-sm ${
                  isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'
                }`}>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{partner.name}</p>
                    <p className="text-[8px] md:text-[9px] font-medium text-gray-400 truncate uppercase">{partner.company}</p>
                  </div>
                  <div className="flex flex-col items-end shrink-0 ml-3">
                    <span className="text-[10px] md:text-xs font-black text-emerald-600 dark:text-verde-neon bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-lg">{conn.score}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          {item.score.scoreReasoning && (
            <div className={`mt-6 p-4 rounded-xl border border-dashed ${
              isDarkMode ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-emerald-50/50 border-emerald-200'
            }`}>
              <p className={`text-[10px] md:text-[11px] font-bold uppercase mb-2 ${isDarkMode ? 'text-verde-neon' : 'text-emerald-800'}`}>Por que esta pontuação?</p>
              <p className={`text-[11px] md:text-xs italic leading-relaxed font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>"{item.score.scoreReasoning}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AnalysisView: React.FC<AnalysisViewProps> = ({ data, onReset, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'matches' | 'list' | 'room'>('overview');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const deferredSearch = useDeferredValue(searchTerm);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const chartsContainerRef = useRef<HTMLDivElement>(null);

  const participantMap = useMemo(() => {
    const map = new Map<string, Participant>();
    data.participants.forEach(p => map.set(p.id, p));
    return map;
  }, [data.participants]);

  const allMatches = useMemo(() => {
    const matches: any[] = [];
    data.individualScores.forEach(score => {
      const p1 = participantMap.get(score.participantId);
      if (!p1) return;
      score.recommendedConnections?.forEach(rec => {
        const p2 = participantMap.get(rec.partnerId);
        if (p2) matches.push({ p1, p2, score: rec.score, reason: rec.reason, id: `${p1.id}-${p2.id}` });
      });
    });
    return matches.sort((a, b) => b.score - a.score);
  }, [data.individualScores, participantMap]);

  const fullList = useMemo(() => {
    let list = data.participants.map(p => {
      const score = data.individualScores.find(s => s.participantId === p.id) || {
        participantId: p.id,
        score: 0,
        potentialConnections: 0,
        recommendedConnections: [],
        scoreReasoning: ''
      };
      return { p, score };
    });
    if (deferredSearch) {
      const term = deferredSearch.toLowerCase();
      list = list.filter(item => item.p.name.toLowerCase().includes(term) || item.p.company.toLowerCase().includes(term));
    }
    return list.sort((a, b) => b.score.score - a.score.score);
  }, [data.participants, data.individualScores, deferredSearch]);

  const sortedSegments = useMemo(() => [...data.segmentDistribution].sort((a,b) => b.value - a.value), [data.segmentDistribution]);
  const sortedIndividuals = useMemo(() => fullList.slice(0, 10).map(item => ({ name: item.p.name, score: item.score.score })), [fullList]);

  // Export Logic
  const captureImage = async (ref: React.RefObject<HTMLDivElement>) => {
    if (!ref.current) return null;
    const canvas = await html2canvas(ref.current, { scale: 2, backgroundColor: isDarkMode ? '#111827' : '#ffffff' });
    return canvas.toDataURL('image/png');
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const mapImg = await captureImage(mapContainerRef);
      const chartsImg = await captureImage(chartsContainerRef);
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [297, 167] });
      const primary = [5, 150, 105];
      const eventName = data.participants[0]?.eventName || "Estratégia de Networking";

      // 1. Capa
      doc.setFillColor(primary[0], primary[1], primary[2]);
      doc.rect(0, 0, 297, 167, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("Montserrat", "bold");
      doc.setFontSize(48);
      doc.text("RAMPUP IN", 148, 70, { align: 'center' });
      doc.setFontSize(22);
      doc.setFont("Montserrat", "normal");
      doc.text("RELATÓRIO DE SINERGIA ESTRATÉGICA", 148, 85, { align: 'center' });
      doc.setFontSize(14);
      doc.text(eventName.toUpperCase(), 148, 120, { align: 'center' });
      doc.text(new Date().toLocaleDateString('pt-BR'), 148, 130, { align: 'center' });

      // 2. Sumário
      doc.addPage();
      doc.setTextColor(primary[0], primary[1], primary[2]);
      doc.setFontSize(28);
      doc.setFont("Montserrat", "bold");
      doc.text("Sumário", 20, 30);
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(16);
      doc.setFont("Montserrat", "normal");
      ["1. Visão Geral do Grupo", "2. Análise de Sinergias (Top 10)", "3. Mapeamento por Participante", "4. Layout da Sala"].forEach((t, i) => doc.text(t, 25, 55 + i * 12));

      // 3. Overview
      doc.addPage();
      doc.setTextColor(primary[0], primary[1], primary[2]);
      doc.setFontSize(24);
      doc.text("1. Visão Geral do Grupo", 20, 25);
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(14);
      doc.text(`Score de Negócio: ${data.overallScore}%`, 20, 40);
      doc.text(`Média de Colaboradores: ${data.averageEmployees}`, 20, 48);
      doc.setFontSize(11);
      const splitSummary = doc.splitTextToSize(data.summary, 250);
      doc.text(splitSummary, 20, 60);
      if (chartsImg) doc.addImage(chartsImg, 'PNG', 20, 95, 257, 60);

      // 4. Top Matches
      doc.addPage();
      doc.text("2. Análise de Sinergias", 20, 25);
      autoTable(doc, {
        startY: 35,
        head: [['P1', 'P2', 'Score', 'Justificativa']],
        body: allMatches.slice(0, 10).map(m => [m.p1.name, m.p2.name, `${m.score}%`, m.reason]),
        styles: { font: 'Montserrat', fontSize: 9 },
        headStyles: { fillColor: primary }
      });

      // 5. Lista
      doc.addPage();
      doc.text("3. Mapeamento Individual", 20, 25);
      autoTable(doc, {
        startY: 35,
        head: [['Nome', 'Empresa', 'Setor', 'Score IN']],
        body: fullList.map(i => [i.p.name, i.p.company, i.p.segment, `${i.score.score}%`]),
        styles: { font: 'Montserrat', fontSize: 8 },
        headStyles: { fillColor: primary }
      });

      // 6. Mapa
      if (mapImg) {
        doc.addPage();
        doc.text("4. Layout Estratégico da Sala", 20, 25);
        doc.addImage(mapImg, 'PNG', 20, 40, 257, 110);
      }

      doc.save(`Apresentacao_Rampup_IN_${new Date().getTime()}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPPTX = async () => {
    setIsExporting(true);
    try {
      const mapImg = await captureImage(mapContainerRef);
      const pptx = new pptxgen();
      pptx.layout = 'LAYOUT_16x9';
      
      const slide1 = pptx.addSlide();
      slide1.background = { color: '059669' };
      slide1.addText("RAMPUP IN", { x: 0, y: 1.5, w: '100%', align: 'center', fontSize: 54, bold: true, color: 'FFFFFF' });
      slide1.addText("RELATÓRIO DE SINERGIA", { x: 0, y: 2.3, w: '100%', align: 'center', fontSize: 24, color: 'FFFFFF' });

      const slide2 = pptx.addSlide();
      slide2.addText("Resumo Executivo", { x: 0.5, y: 0.5, fontSize: 32, bold: true, color: '059669' });
      slide2.addText(`Business Index: ${data.overallScore}%`, { x: 0.5, y: 1.2, fontSize: 18, bold: true });
      slide2.addText(data.summary, { x: 0.5, y: 2.0, w: 9, fontSize: 14, color: '444444' });

      if (mapImg) {
        const slide3 = pptx.addSlide();
        slide3.addText("Layout Estratégico", { x: 0.5, y: 0.5, fontSize: 28, bold: true, color: '059669' });
        slide3.addImage({ data: mapImg, x: 0.5, y: 1.2, w: 9, h: 4.5 });
      }

      pptx.writeFile({ fileName: `Apresentacao_Rampup_IN.pptx` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportXLSX = () => {
    const rows = fullList.map(item => ({
      Nome: item.p.name,
      Empresa: item.p.company,
      Setor: item.p.segment,
      Score_IN: item.score.score,
      Conexoes: item.score.recommendedConnections?.map(c => `${participantMap.get(c.partnerId)?.name} (${c.score}%)`).join('; ')
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Networking");
    XLSX.writeFile(wb, "Rampup_IN_Relatorio.xlsx");
  };

  return (
    <div className={`max-w-6xl mx-auto space-y-6 md:space-y-8 animate-fade-in mb-20 px-4 md:px-0`}>
      {/* Header Executivo */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b pb-8 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
        <div>
           <button onClick={onReset} className="text-[10px] font-black uppercase text-gray-400 hover:text-emerald-600 mb-2 flex items-center gap-2 transition-all">
             <ArrowLeft className="w-3 h-3" /> Nova Análise
           </button>
           <h2 className={`text-2xl md:text-3xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
             Dashboard <span className="text-emerald-600">IN</span>
           </h2>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
           <button onClick={handleExportXLSX} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-gray-800 text-verde-neon hover:bg-gray-700' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
             <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
           </button>
           <button onClick={handleExportPDF} disabled={isExporting} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-gray-800 text-blue-400 hover:bg-gray-700' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
             <FileDown className="w-3.5 h-3.5" /> PDF (16:9)
           </button>
           <button onClick={handleExportPPTX} disabled={isExporting} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-gray-800 text-orange-400 hover:bg-gray-700' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}>
             <Presentation className="w-3.5 h-3.5" /> PPTX
           </button>
        </div>
      </div>

      {/* Tabs Mobile-First */}
      <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        <div className={`flex p-1 rounded-2xl w-fit md:w-fit border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
            {(['overview', 'matches', 'list', 'room'] as const).map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`whitespace-nowrap px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab 
                    ? 'bg-emerald-600 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'overview' ? 'Geral' : tab === 'matches' ? 'Conexões' : tab === 'list' ? 'Lista' : 'Mapa'}
              </button>
            ))}
        </div>
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'overview' && (
          <div className="space-y-6 md:space-y-8 animate-fade-in">
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className={`p-4 md:p-6 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                   <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1">Score Geral</p>
                   <h3 className="text-2xl md:text-3xl font-black text-emerald-600">{data.overallScore}%</h3>
                </div>
                <div className={`p-4 md:p-6 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                   <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1">Participantes</p>
                   <h3 className={`text-2xl md:text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{data.participants.length}</h3>
                </div>
                <div className={`p-4 md:p-6 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                   <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1">Média Colab.</p>
                   <h3 className="text-2xl md:text-3xl font-black text-blue-500">{data.averageEmployees}</h3>
                </div>
                <div className={`p-4 md:p-6 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                   <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1">Sinergias</p>
                   <h3 className="text-2xl md:text-3xl font-black text-amber-500">{allMatches.filter(m => m.score >= 85).length}</h3>
                </div>
             </div>

             <div className={`p-6 md:p-8 rounded-3xl border-2 border-dashed ${isDarkMode ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50/50 border-emerald-100'}`}>
                <h3 className={`text-[10px] md:text-xs font-black uppercase mb-4 flex items-center gap-2 ${isDarkMode ? 'text-verde-neon' : 'text-emerald-800'}`}>
                  <FileText className="w-3.5 md:w-4 h-3.5 md:h-4" /> Diagnóstico da IA
                </h3>
                <p className={`text-xs md:text-sm font-medium leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>"{data.summary}"</p>
             </div>

             <div ref={chartsContainerRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <div className={`p-6 md:p-8 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                   <h3 className="text-[10px] font-black text-gray-400 uppercase mb-6 tracking-widest flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Sinergia por Participante</h3>
                   <div className="h-[300px] md:h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sortedIndividuals} layout="vertical">
                          <XAxis type="number" hide domain={[0, 100]} />
                          <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 9, fontWeight: 'bold', fill: isDarkMode ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                          <Bar dataKey="score" fill="#10B981" radius={[0, 8, 8, 0]} barSize={14}>
                             {sortedIndividuals.map((_, i) => <Cell key={i} fill={i === 0 ? '#059669' : '#10B981'} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>
                <div className={`p-6 md:p-8 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                   <h3 className="text-[10px] font-black text-gray-400 uppercase mb-6 tracking-widest flex items-center gap-2"><Briefcase className="w-4 h-4" /> Distribuição Setorial</h3>
                   <div className="grid grid-cols-2 gap-3 md:gap-4 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
                      {sortedSegments.map((s, idx) => (
                        <div key={idx} className={`p-3 md:p-4 rounded-2xl border flex justify-between items-center transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100 hover:border-emerald-200'}`}>
                           <span className="text-[9px] md:text-[10px] font-black uppercase text-gray-400">{s.name}</span>
                           <span className="text-sm md:text-base font-black text-emerald-600">{s.value}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'matches' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 animate-fade-in">
              {allMatches.slice(0, 24).map(match => (
                 <div key={match.id} className={`p-5 md:p-6 rounded-3xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer group ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`} onClick={() => setSelectedMatch(match)}>
                    <div className="flex justify-between items-center mb-4">
                       <span className={`text-xl md:text-2xl font-black px-3 py-1 rounded-xl border ${isDarkMode ? 'text-verde-neon bg-emerald-950/20 border-emerald-900/40' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>{match.score}%</span>
                       <Zap className="w-4 h-4 text-gray-200 group-hover:text-emerald-300 transition-colors" />
                    </div>
                    <div className="flex items-center gap-3 md:gap-4 mb-4">
                       <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm md:text-base truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{match.p1.name}</p>
                          <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase truncate">{match.p1.company}</p>
                       </div>
                       <ArrowRight className="w-4 h-4 text-gray-200" />
                       <div className="flex-1 min-w-0 text-right">
                          <p className={`font-bold text-sm md:text-base truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{match.p2.name}</p>
                          <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase truncate">{match.p2.company}</p>
                       </div>
                    </div>
                    <p className={`text-[10px] md:text-[11px] italic leading-relaxed line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>"{match.reason}"</p>
                 </div>
              ))}
           </div>
        )}

        {activeTab === 'list' && (
           <div className="space-y-4 md:space-y-6 animate-fade-in">
              <div className="relative group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-emerald-500 transition-colors" />
                 <input 
                    type="text" 
                    placeholder="Buscar por nome ou empresa..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className={`w-full border rounded-2xl py-3.5 md:py-4 pl-12 pr-4 outline-none focus:ring-2 ring-emerald-500/10 transition-all font-medium text-xs md:text-sm shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`} 
                 />
              </div>
              <div className="grid grid-cols-1 gap-3">
                 {fullList.map(item => (
                    <ParticipantRow 
                      key={item.p.id} 
                      item={item} 
                      isExpanded={expandedId === item.p.id}
                      onToggle={() => setExpandedId(expandedId === item.p.id ? null : item.p.id)}
                      participantMap={participantMap}
                      isDarkMode={isDarkMode}
                    />
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'room' && (
           <div ref={mapContainerRef} className={`p-4 rounded-[2.5rem] border shadow-sm overflow-hidden min-h-[500px] ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
              <SeatingView data={data} isDarkMode={isDarkMode} />
           </div>
        )}
      </div>

      {/* Modal Mobile-Responsive */}
      {selectedMatch && (
         <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedMatch(null)}>
            <div className={`rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-lg p-8 md:p-10 shadow-2xl border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`} onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-6 md:mb-8">
                  <h3 className={`text-lg md:text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Análise de Sinergia</h3>
                  <button onClick={() => setSelectedMatch(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
               </div>
               <div className="flex items-center gap-4 mb-6 md:mb-8">
                  <div className={`text-3xl md:text-4xl font-black px-4 py-2 rounded-2xl border ${isDarkMode ? 'text-verde-neon bg-emerald-950/20 border-emerald-900/40' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>{selectedMatch.score}%</div>
                  <div className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Match de Valor</div>
               </div>
               <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                  <div className={`p-4 md:p-5 rounded-2xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                     <p className={`text-[8px] md:text-[9px] font-black uppercase mb-1 ${isDarkMode ? 'text-verde-neon' : 'text-emerald-700'}`}>Participante A</p>
                     <p className={`font-bold text-sm md:text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedMatch.p1.name}</p>
                     <p className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase truncate">{selectedMatch.p1.company} • {selectedMatch.p1.segment}</p>
                  </div>
                  <div className={`p-4 md:p-5 rounded-2xl border text-right ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                     <p className={`text-[8px] md:text-[9px] font-black uppercase mb-1 ${isDarkMode ? 'text-verde-neon' : 'text-emerald-700'}`}>Participante B</p>
                     <p className={`font-bold text-sm md:text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedMatch.p2.name}</p>
                     <p className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase truncate">{selectedMatch.p2.company} • {selectedMatch.p2.segment}</p>
                  </div>
               </div>
               <div className={`p-5 md:p-6 border-2 border-dashed rounded-3xl ${isDarkMode ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50/30 border-emerald-100'}`}>
                  <p className={`text-xs md:text-sm italic leading-relaxed font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>"{selectedMatch.reason}"</p>
               </div>
               <button onClick={() => setSelectedMatch(null)} className="w-full mt-6 md:mt-8 py-3.5 md:py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 uppercase tracking-widest text-[10px] md:text-xs">Fechar</button>
            </div>
         </div>
      )}
    </div>
  );
};

export default AnalysisView;
