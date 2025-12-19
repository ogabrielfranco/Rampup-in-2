import React, { useState, useMemo, useDeferredValue, useRef } from 'react';
import { AnalysisResult, Participant, IndividualScore } from '../types';
import SeatingView from './SeatingView';
import { 
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip
} from 'recharts';
import { 
  ArrowLeft, ArrowRight, FileSpreadsheet, Search, 
  X, Crown, ChevronRight, FileText, Presentation, 
  Zap, FileDown, Target, Briefcase, TrendingUp, AlertCircle, Users
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import pptxgen from 'pptxgenjs';

interface AnalysisViewProps {
  data: AnalysisResult;
  onReset: () => void;
  isDarkMode: boolean;
}

const ParticipantRow: React.FC<{
  item: { p: Participant; score: IndividualScore };
  isExpanded: boolean;
  onToggle: () => void;
  participantMap: Map<string, Participant>;
  inboundConnections: { partnerId: string; score: number; reason: string }[];
  isDarkMode: boolean;
}> = ({ item, isExpanded, onToggle, participantMap, inboundConnections, isDarkMode }) => {
  const hasInbound = inboundConnections.length > 0;
  const isIsolated = inboundConnections.length < 2 && item.score.score < 20; 

  return (
    <div className={`rounded-2xl border transition-all duration-300 overflow-hidden mb-3 ${
      isExpanded 
        ? 'border-emerald-500 shadow-lg ring-1 ring-emerald-500/10' 
        : isIsolated
          ? (isDarkMode ? 'border-red-900/50 bg-red-950/20' : 'border-red-200 bg-red-50 shadow-sm')
          : (isDarkMode ? 'border-gray-800 bg-gray-900/40 hover:bg-gray-900' : 'border-gray-100 bg-white hover:border-emerald-200 shadow-sm')
    }`}>
      <div 
        onClick={onToggle}
        className="p-4 md:p-5 cursor-pointer flex items-center gap-3 md:gap-4 select-none"
      >
        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex flex-col items-center justify-center shadow-sm shrink-0 border ${
          isIsolated 
            ? 'bg-red-100 border-red-300 text-red-600'
            : isDarkMode ? 'bg-gray-800 border-gray-700 text-verde-neon' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
        }`}>
          <span className="text-lg md:text-xl font-black leading-none">{item.score.score}</span>
          <span className="text-[6px] md:text-[7px] font-black uppercase opacity-60 mt-0.5 tracking-tighter">Index IN</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-bold text-sm md:text-base flex items-center gap-2 truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {item.p.name} {item.p.isHost && <Crown className="w-3 md:w-4 h-3 md:h-4 text-amber-500 fill-amber-500" />}
            {isIsolated && <AlertCircle className="w-3 md:w-4 h-3 md:h-4 text-red-500" />}
          </h4>
          <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
            {item.p.company} • {item.p.segment}
          </p>
        </div>
        <ChevronRight className={`w-4 md:w-5 h-4 md:h-5 text-gray-300 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-emerald-500' : ''}`} />
      </div>
      
      {isExpanded && (
        <div className={`${isDarkMode ? 'bg-black/30' : 'bg-gray-50/30'} border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} p-4 md:p-6 animate-fade-in`}>
          <div className="flex items-center gap-2 mb-5">
             <Target className="w-3 md:w-4 h-3 md:h-4 text-emerald-600" />
             <h5 className={`text-[10px] md:text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
               Quem se conecta com {item.p.name.split(' ')[0]} ({inboundConnections.length})
             </h5>
          </div>
          
          {!hasInbound ? (
            <div className="text-center py-8">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-red-500 uppercase tracking-widest">Nenhuma conexão de entrada</p>
              <p className="text-xs text-gray-500 mt-1">Este participante não possui sinergia imediata com o grupo atual.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {inboundConnections.sort((a,b) => b.score - a.score).map((conn, idx) => {
                const partner = participantMap.get(conn.partnerId);
                if (!partner) return null;
                return (
                  <div key={idx} className={`p-4 rounded-xl border flex flex-col gap-2 shadow-sm transition-all h-full ${
                    isDarkMode ? 'bg-gray-900 border-gray-800 hover:border-emerald-900' : 'bg-white border-gray-100 hover:border-emerald-200'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                          {partner.name} {partner.isHost && <Crown className="w-2.5 h-2.5 inline text-amber-500" />}
                        </p>
                        <p className="text-[8px] font-medium text-gray-400 truncate uppercase">{partner.company}</p>
                      </div>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg border shrink-0 ${
                        conn.score >= 75 
                          ? (isDarkMode ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900' : 'bg-emerald-50 text-emerald-600 border-emerald-100')
                          : conn.score >= 40
                          ? (isDarkMode ? 'bg-blue-950/20 text-blue-400 border-blue-900' : 'bg-blue-50 text-blue-600 border-blue-100')
                          : (isDarkMode ? 'bg-gray-800 text-gray-500 border-gray-700' : 'bg-gray-50 text-gray-500 border-gray-200')
                      }`}>{conn.score}%</span>
                    </div>
                    <p className={`text-[10px] leading-relaxed italic mt-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      "{conn.reason}"
                    </p>
                  </div>
                );
              })}
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
  const chartRef = useRef<HTMLDivElement>(null);

  const participantMap = useMemo(() => {
    const map = new Map<string, Participant>();
    data.participants.forEach(p => map.set(p.id, p));
    return map;
  }, [data.participants]);

  const inboundConnectionsMap = useMemo(() => {
    const map = new Map<string, { partnerId: string; score: number; reason: string }[]>();
    data.individualScores.forEach(score => {
      score.recommendedConnections?.forEach(conn => {
        const targetId = conn.partnerId;
        const list = map.get(targetId) || [];
        list.push({ partnerId: score.participantId, score: conn.score, reason: conn.reason });
        map.set(targetId, list);
      });
    });
    return map;
  }, [data.individualScores]);

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

  const sortedSegments = useMemo(() => [...data.segmentDistribution].sort((a,b) => b.value - a.value), [data.segmentDistribution]);
  
  const topCompaniesByEmployees = useMemo(() => {
    return data.participants
      .map(p => ({
        name: p.company,
        employees: parseInt(p.employeeCount || '0', 10) || 0,
        owner: p.name
      }))
      .filter(p => p.employees > 0)
      .sort((a, b) => b.employees - a.employees)
      .slice(0, 10);
  }, [data.participants]);

  const captureElement = async (ref: React.RefObject<HTMLDivElement>) => {
    if (!ref.current) return null;
    const canvas = await html2canvas(ref.current, {
      scale: 2,
      backgroundColor: isDarkMode ? '#0a0f1a' : '#ffffff',
      useCORS: true,
      logging: false
    });
    return canvas.toDataURL('image/png');
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const mapImg = await captureElement(mapContainerRef);
      const chartsImg = await captureElement(chartRef);
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [297, 167] });
      const primary: [number, number, number] = [5, 150, 105];
      const eventName = data.participants[0]?.eventName || "SUMMIT DE NEGÓCIOS";

      doc.setFillColor(primary[0], primary[1], primary[2]);
      doc.rect(0, 0, 297, 167, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(54);
      doc.text("RAMPUP IN", 148, 70, { align: 'center' });
      doc.setFontSize(22);
      doc.text("INTELIGÊNCIA ESTRATÉGICA DE NETWORKING", 148, 85, { align: 'center' });
      
      doc.addPage();
      doc.setTextColor(0);
      doc.text("Resumo de Performance", 20, 25);
      doc.setFontSize(12);
      doc.text(`Business Index: ${data.overallScore}%`, 20, 35);
      doc.text(`Média de Colaboradores: ${data.averageEmployees}`, 20, 42);
      if (chartsImg) doc.addImage(chartsImg, 'PNG', 20, 50, 257, 100);

      doc.addPage();
      doc.text("Mapeamento Geral", 20, 25);
      autoTable(doc, {
        startY: 35,
        head: [['Executivo', 'Corporação', 'Setor', 'Index IN']],
        body: fullList.map(item => [item.p.name, item.p.company, item.p.segment, `${item.score.score}%`]),
      });

      if (mapImg) {
        doc.addPage();
        doc.text("Mapa Estratégico da Sala", 20, 25);
        doc.addImage(mapImg, 'PNG', 20, 40, 257, 110);
      }
      doc.save(`Rampup_IN_${new Date().getTime()}.pdf`);
    } catch (err) { console.error(err); } finally { setIsExporting(false); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-fade-in mb-20 px-4 md:px-0">
      {/* Header */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b pb-8 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
        <div>
           <button onClick={onReset} className="text-[10px] font-black uppercase text-gray-400 hover:text-emerald-600 mb-2 flex items-center gap-2 transition-all group">
             <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> Voltar
           </button>
           <h2 className={`text-2xl md:text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
             Dashboard <span className="text-emerald-600">IN</span>
           </h2>
        </div>
        <div className="flex flex-wrap gap-2">
           {/* Fix: Removed duplicate onClick attribute to resolve JSX element error */}
           <button className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-gray-800 text-verde-neon' : 'bg-emerald-50 text-emerald-700'}`} onClick={handleExportPDF}>
             <FileDown className="w-3.5 h-3.5 inline mr-2" /> Relatório Executivo
           </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex p-1 rounded-2xl w-full border shadow-sm sticky top-[72px] z-50 ${isDarkMode ? 'bg-chumbo-950/90 border-gray-800' : 'bg-gray-100/90 border-gray-200'} backdrop-blur-md`}>
          {(['overview', 'matches', 'list', 'room'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
              {tab === 'overview' ? 'Panorama' : tab === 'matches' ? 'Sinergias' : tab === 'list' ? 'Participantes' : 'Mapa da Sala'}
            </button>
          ))}
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'overview' && (
          <div className="space-y-6 md:space-y-8 animate-fade-in">
             {/* Key Indicators */}
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className={`p-4 md:p-6 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                   <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Index de Negócio</p>
                   <h3 className="text-2xl md:text-3xl font-black text-emerald-600">{data.overallScore}%</h3>
                </div>
                <div className={`p-4 md:p-6 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                   <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Média de Colaboradores</p>
                   <h3 className="text-2xl md:text-3xl font-black text-blue-500">{data.averageEmployees}</h3>
                </div>
                <div className={`p-4 md:p-6 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                   <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Participantes</p>
                   <h3 className={`text-2xl md:text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{data.participants.length}</h3>
                </div>
                <div className={`p-4 md:p-6 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                   <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Matches Premium</p>
                   <h3 className="text-2xl md:text-3xl font-black text-amber-500">{allMatches.filter(m => m.score >= 80).length}</h3>
                </div>
             </div>

             <div className={`p-6 md:p-8 rounded-3xl border-2 border-dashed ${isDarkMode ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50/50 border-emerald-100'}`}>
                <h3 className={`text-[10px] font-black uppercase mb-4 flex items-center gap-2 ${isDarkMode ? 'text-verde-neon' : 'text-emerald-800'}`}>
                  <FileText className="w-4 h-4" /> Diagnóstico Estratégico (IA)
                </h3>
                <p className={`text-sm md:text-base font-medium leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>"{data.summary}"</p>
             </div>

             <div ref={chartRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* Top 10 by Employees */}
                <div className={`p-6 md:p-8 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                   <h3 className="text-[10px] font-black text-gray-400 uppercase mb-6 tracking-widest flex items-center gap-2">
                     <Users className="w-4 h-4" /> Maiores Forças de Trabalho (Top 10)
                   </h3>
                   <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topCompaniesByEmployees} layout="vertical">
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 9, fontWeight: 'bold', fill: isDarkMode ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', fontSize: '10px' }} />
                          <Bar dataKey="employees" fill="#3B82F6" radius={[0, 8, 8, 0]} barSize={14} isAnimationActive={true} animationDuration={1000} />
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>

                {/* Distribution by Segment */}
                <div className={`p-6 md:p-8 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                   <h3 className="text-[10px] font-black text-gray-400 uppercase mb-6 tracking-widest flex items-center gap-2">
                     <Briefcase className="w-4 h-4" /> Concentração por Segmento
                   </h3>
                   <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sortedSegments} layout="vertical">
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 9, fontWeight: 'bold', fill: isDarkMode ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                           <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', fontSize: '10px' }} />
                           <Bar dataKey="value" fill="#10B981" radius={[0, 8, 8, 0]} barSize={14} isAnimationActive={true} animationDuration={1200} />
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'matches' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
              {allMatches.slice(0, 30).map(match => (
                 <div key={match.id} className={`p-6 rounded-3xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer group flex flex-col justify-between h-full ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`} onClick={() => setSelectedMatch(match)}>
                    <div className="flex justify-between items-center mb-4">
                       <span className={`text-xl font-black px-3 py-1 rounded-xl border ${isDarkMode ? 'text-verde-neon bg-emerald-950/20 border-emerald-900/40' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>{match.score}%</span>
                       <Zap className="w-4 h-4 text-gray-200 group-hover:text-emerald-300 transition-colors" />
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                       <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{match.p1.name}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase truncate">{match.p1.company}</p>
                       </div>
                       <ArrowRight className="w-4 h-4 text-gray-200" />
                       <div className="flex-1 min-w-0 text-right">
                          <p className={`font-bold text-sm truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{match.p2.name}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase truncate">{match.p2.company}</p>
                       </div>
                    </div>
                    <p className={`text-[11px] italic leading-relaxed line-clamp-2 mt-auto p-3 rounded-xl ${isDarkMode ? 'bg-black/20 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>"{match.reason}"</p>
                 </div>
              ))}
           </div>
        )}

        {activeTab === 'list' && (
           <div className="space-y-4 md:space-y-6 animate-fade-in">
              <div className={`relative group p-1 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-900 border-gray-800 focus-within:border-emerald-900' : 'bg-white border-gray-200 focus-within:border-emerald-300'}`}>
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <input 
                    type="text" 
                    placeholder="Filtrar por nome ou empresa..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className={`w-full py-4 pl-12 pr-4 outline-none bg-transparent font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`} 
                 />
              </div>
              <div className="grid grid-cols-1 gap-2">
                 {fullList.map(item => (
                    <ParticipantRow 
                      key={item.p.id} 
                      item={item} 
                      isExpanded={expandedId === item.p.id}
                      onToggle={() => setExpandedId(expandedId === item.p.id ? null : item.p.id)}
                      participantMap={participantMap}
                      inboundConnections={inboundConnectionsMap.get(item.p.id) || []}
                      isDarkMode={isDarkMode}
                    />
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'room' && (
           <div ref={mapContainerRef} className={`p-4 rounded-[2.5rem] border shadow-sm min-h-[500px] ${isDarkMode ? 'bg-chumbo-900 border-gray-800' : 'bg-white border-gray-100'}`}>
              <SeatingView data={data} isDarkMode={isDarkMode} />
           </div>
        )}
      </div>

      {selectedMatch && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => setSelectedMatch(null)}>
            <div className={`rounded-3xl w-full max-w-lg p-8 md:p-10 shadow-2xl border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`} onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-8">
                  <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Tese de Sinergia</h3>
                  <button onClick={() => setSelectedMatch(null)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}><X className="w-5 h-5 text-gray-400" /></button>
               </div>
               <div className="space-y-4 mb-8">
                  <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                     <p className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedMatch.p1.name}</p>
                     <p className="text-[10px] text-gray-500 font-bold uppercase">{selectedMatch.p1.company}</p>
                  </div>
                  <div className={`p-5 rounded-2xl border text-right ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                     <p className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedMatch.p2.name}</p>
                     <p className="text-[10px] text-gray-500 font-bold uppercase">{selectedMatch.p2.company}</p>
                  </div>
               </div>
               <p className="text-xs md:text-sm italic leading-relaxed font-medium">"{selectedMatch.reason}"</p>
               <button onClick={() => setSelectedMatch(null)} className="w-full mt-8 py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 shadow-xl uppercase tracking-widest text-[10px] md:text-xs">Fechar</button>
            </div>
         </div>
      )}
    </div>
  );
};

export default AnalysisView;
