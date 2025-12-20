import React, { useState, useMemo, useDeferredValue, useRef } from 'react';
import { AnalysisResult, Participant, IndividualScore } from '../types';
import SeatingView from './SeatingView';
import { 
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip
} from 'recharts';
import { 
  ArrowLeft, ArrowRight, Search, 
  X, Crown, ChevronRight, FileText, 
  Zap, FileDown, Target, Briefcase, AlertCircle, Users, ShoppingCart, TrendingDown, Handshake
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

interface SynergyBadgeProps {
  type?: string;
  isDarkMode: boolean;
}

const SynergyBadge: React.FC<SynergyBadgeProps> = ({ type, isDarkMode }) => {
  if (!type) return null;
  
  const config = {
    'COMPRA': { 
      label: 'Compra', 
      icon: ShoppingCart, 
      colors: isDarkMode ? 'bg-blue-900/40 text-blue-400 border-blue-800' : 'bg-blue-50 text-blue-600 border-blue-100' 
    },
    'VENDA': { 
      label: 'Venda', 
      icon: TrendingDown, 
      colors: isDarkMode ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-600 border-emerald-100' 
    },
    'PARCERIA': { 
      label: 'Parceria', 
      icon: Handshake, 
      colors: isDarkMode ? 'bg-amber-900/40 text-amber-400 border-amber-800' : 'bg-amber-50 text-amber-600 border-amber-100' 
    }
  }[type as 'COMPRA' | 'VENDA' | 'PARCERIA'] || { 
    label: type, 
    icon: Zap, 
    colors: isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-50 text-gray-500 border-gray-100' 
  };

  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${config.colors}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </div>
  );
};

interface ParticipantRowProps {
  item: { p: Participant; score: IndividualScore };
  isExpanded: boolean;
  onToggle: () => void;
  participantMap: Map<string, Participant>;
  allConnections: { partnerId: string; score: number; reason: string; synergyType?: string }[];
  isDarkMode: boolean;
}

const ParticipantRow: React.FC<ParticipantRowProps> = ({ item, isExpanded, onToggle, participantMap, allConnections, isDarkMode }) => {
  const hasInbound = allConnections.length > 0;
  
  return (
    <div className={`rounded-2xl border transition-all duration-300 overflow-hidden mb-4 ${
      isExpanded 
        ? 'border-emerald-200 shadow-md' 
        : isDarkMode ? 'border-gray-800 bg-gray-900/40 hover:bg-gray-900' : 'border-gray-100 bg-white hover:border-gray-200 shadow-sm'
    }`}>
      <div 
        onClick={onToggle}
        className="p-4 md:p-6 cursor-pointer flex items-center gap-4 md:gap-6 select-none"
      >
        <div className={`w-14 h-14 md:w-16 md:h-16 rounded-xl flex flex-col items-center justify-center shrink-0 border transition-colors ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700 text-verde-neon' 
            : 'bg-emerald-50/50 border-emerald-100 text-emerald-600'
        }`}>
          <span className="text-xl md:text-2xl font-black leading-none">{item.score.score}</span>
          <span className="text-[7px] md:text-[8px] font-black uppercase opacity-60 mt-0.5 tracking-tighter">Index IN</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className={`font-bold text-base md:text-lg truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {item.p.name}
            </h4>
            {item.p.isHost && <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />}
          </div>
          <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest truncate">
            {item.p.company} • {item.p.segment} • {item.p.employeeCount || '0'} COLAB.
          </p>
        </div>
        
        <ChevronRight className={`w-5 h-5 text-gray-300 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-emerald-500' : ''}`} />
      </div>
      
      {isExpanded && (
        <div className={`${isDarkMode ? 'bg-black/30' : 'bg-gray-50/10'} border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} p-5 md:p-8 animate-fade-in`}>
          <div className="flex items-center gap-2 mb-8">
             <div className="flex items-center justify-center p-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20">
               <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
             </div>
             <h5 className={`text-[11px] md:text-[12px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
               Conexões Sugeridas ({allConnections.length})
             </h5>
          </div>
          
          {!hasInbound ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Identificando sinergias do ecossistema...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {allConnections.sort((a,b) => b.score - a.score).map((conn, idx) => {
                const partner = participantMap.get(conn.partnerId);
                if (!partner) return null;
                return (
                  <div key={idx} className={`p-6 rounded-3xl border relative flex flex-col gap-4 shadow-sm hover:shadow-md transition-all ${
                    isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100/50'
                  }`}>
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className={`text-[15px] font-black truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {partner.name}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 truncate uppercase tracking-wider">{partner.company}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                           <SynergyBadge type={conn.synergyType} isDarkMode={isDarkMode} />
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-xl text-[11px] font-black border shrink-0 ${
                        conn.score >= 80 
                          ? (isDarkMode ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50' : 'bg-emerald-50/50 text-emerald-600 border-emerald-100')
                          : (isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-50 text-gray-500 border-gray-100')
                      }`}>
                        {conn.score}%
                      </div>
                    </div>
                    <div className={`text-[12px] leading-relaxed italic border-t pt-4 mt-2 font-medium ${isDarkMode ? 'text-gray-400 border-gray-800' : 'text-gray-500/80 border-gray-50'}`}>
                      "{conn.reason}"
                    </div>
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

interface AnalysisViewProps {
  data: AnalysisResult;
  onReset: () => void;
  isDarkMode: boolean;
}

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

  const unifiedConnectionsMap = useMemo(() => {
    const map = new Map<string, { partnerId: string; score: number; reason: string; synergyType?: string }[]>();
    
    data.individualScores.forEach(score => {
      const list = map.get(score.participantId) || [];
      score.recommendedConnections?.forEach(conn => {
        list.push({ partnerId: conn.partnerId, score: conn.score, reason: conn.reason, synergyType: conn.synergyType });
      });
      map.set(score.participantId, list);
    });

    data.individualScores.forEach(score => {
      score.recommendedConnections?.forEach(conn => {
        const targetId = conn.partnerId;
        const list = map.get(targetId) || [];
        if (!list.find(l => l.partnerId === score.participantId)) {
          let invertedType = conn.synergyType;
          if (conn.synergyType === 'COMPRA') invertedType = 'VENDA';
          else if (conn.synergyType === 'VENDA') invertedType = 'COMPRA';

          list.push({ 
            partnerId: score.participantId, 
            score: conn.score, 
            reason: `Sinergia de Ecossistema: ${conn.reason}`,
            synergyType: invertedType
          });
        }
        map.set(targetId, list);
      });
    });

    return map;
  }, [data.individualScores]);

  const fullList = useMemo(() => {
    let list = data.participants.map(p => {
      const scoreData = data.individualScores.find(s => s.participantId === p.id);
      const unified = unifiedConnectionsMap.get(p.id) || [];
      
      let finalScore = scoreData?.score || 0;
      if (finalScore === 0 && unified.length > 0) {
        const topMatchesAvg = unified
          .sort((a,b) => b.score - a.score)
          .slice(0, 3)
          .reduce((acc, curr) => acc + curr.score, 0) / Math.min(unified.length, 3);
        finalScore = Math.max(25, Math.round(topMatchesAvg * 0.85)); 
      }

      const score = scoreData || {
        participantId: p.id,
        score: finalScore,
        potentialConnections: unified.length,
        recommendedConnections: [],
        scoreReasoning: ''
      };

      return { p, score: { ...score, score: finalScore } };
    });
    
    if (deferredSearch) {
      const term = deferredSearch.toLowerCase();
      list = list.filter(item => item.p.name.toLowerCase().includes(term) || item.p.company.toLowerCase().includes(term));
    }
    return list.sort((a, b) => b.score.score - a.score.score);
  }, [data.participants, data.individualScores, deferredSearch, unifiedConnectionsMap]);

  const allMatches = useMemo(() => {
    const matches: any[] = [];
    data.individualScores.forEach(score => {
      const p1 = participantMap.get(score.participantId);
      if (!p1) return;
      score.recommendedConnections?.forEach(rec => {
        const p2 = participantMap.get(rec.partnerId);
        if (p2) matches.push({ p1, p2, score: rec.score, reason: rec.reason, synergyType: rec.synergyType, id: `${p1.id}-${p2.id}` });
      });
    });
    return matches.sort((a, b) => b.score - a.score);
  }, [data.individualScores, participantMap]);

  const sortedSegments = useMemo(() => [...data.segmentDistribution].sort((a,b) => b.value - a.value), [data.segmentDistribution]);
  
  const topCompaniesByEmployees = useMemo(() => {
    return data.participants
      .map(p => ({
        name: p.company,
        employees: parseInt(p.employeeCount?.replace(/\D/g, '') || '0', 10) || 0
      }))
      .filter(p => p.employees > 0)
      .sort((a, b) => b.employees - a.employees)
      .slice(0, 10);
  }, [data.participants]);

  const captureElement = async (element: HTMLDivElement | null) => {
    if (!element) return null;
    const canvas = await html2canvas(element, {
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
      const mapImg = await captureElement(mapContainerRef.current);
      const chartsImg = await captureElement(chartRef.current);
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [297, 167] });
      const primary: [number, number, number] = [5, 150, 105];
      
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
      doc.save(`Rampup_IN_Relatorio_${new Date().getTime()}.pdf`);
    } catch (err) { console.error(err); } finally { setIsExporting(false); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-fade-in mb-20 px-4 md:px-0">
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
           <button className={`px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-sm ${isDarkMode ? 'bg-gray-800 text-verde-neon border border-gray-700 hover:bg-gray-700' : 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100'}`} onClick={handleExportPDF} disabled={isExporting}>
             <FileDown className="w-4 h-4 inline mr-2" /> {isExporting ? 'Processando...' : 'Relatório Premium'}
           </button>
        </div>
      </div>

      <div className={`flex p-1.5 rounded-2xl w-full border shadow-sm sticky top-[72px] z-50 ${isDarkMode ? 'bg-chumbo-950/90 border-gray-800' : 'bg-gray-100/90 border-gray-200'} backdrop-blur-md`}>
          {(['overview', 'matches', 'list', 'room'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${activeTab === tab ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
              {tab === 'overview' ? 'Panorama' : tab === 'matches' ? 'Sinergias' : tab === 'list' ? 'Participantes' : 'Mapa da Sala'}
            </button>
          ))}
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'overview' && (
          <div className="space-y-6 md:space-y-8 animate-fade-in">
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-6 rounded-[2rem] border shadow-sm transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                   <p className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Index IN (Agenda)</p>
                   <h3 className="text-3xl md:text-4xl font-black text-emerald-600">{data.overallScore}%</h3>
                </div>
                <div className={`p-6 rounded-[2rem] border shadow-sm transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                   <p className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Média Colaboradores</p>
                   <h3 className="text-3xl md:text-4xl font-black text-blue-500">{data.averageEmployees.toLocaleString()}</h3>
                </div>
                <div className={`p-6 rounded-[2rem] border shadow-sm transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                   <p className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Pessoas Mapeadas</p>
                   <h3 className={`text-3xl md:text-4xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{data.participants.length}</h3>
                </div>
                <div className={`p-6 rounded-[2rem] border shadow-sm transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                   <p className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Matches Premium</p>
                   <h3 className="text-3xl md:text-4xl font-black text-amber-500">{allMatches.filter(m => m.score >= 80).length}</h3>
                </div>
             </div>

             <div className={`p-8 rounded-[2.5rem] border-2 border-dashed ${isDarkMode ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50/50 border-emerald-100'}`}>
                <h3 className={`text-[11px] font-black uppercase mb-5 flex items-center gap-3 ${isDarkMode ? 'text-verde-neon' : 'text-emerald-800'}`}>
                  <FileText className="w-5 h-5" /> Diagnóstico Estratégico por Ecossistemas
                </h3>
                <p className={`text-sm md:text-lg font-medium leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>"{data.summary}"</p>
             </div>

             <div ref={chartRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className={`p-8 rounded-[2.5rem] border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                   <h3 className="text-[11px] font-black text-gray-400 uppercase mb-8 tracking-widest flex items-center gap-2">
                     <Users className="w-5 h-5" /> Maiores Forças de Trabalho
                   </h3>
                   <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topCompaniesByEmployees} layout="vertical">
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10, fontWeight: 'bold', fill: isDarkMode ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '16px', fontSize: '11px', fontWeight: 'bold' }} />
                          <Bar dataKey="employees" fill="#3B82F6" radius={[0, 10, 10, 0]} barSize={18} isAnimationActive={true} animationDuration={1000} />
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>

                <div className={`p-8 rounded-[2.5rem] border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                   <h3 className="text-[11px] font-black text-gray-400 uppercase mb-8 tracking-widest flex items-center gap-2">
                     <Briefcase className="w-5 h-5" /> Concentração por Segmento
                   </h3>
                   <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sortedSegments} layout="vertical">
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10, fontWeight: 'bold', fill: isDarkMode ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                           <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '16px', fontSize: '11px', fontWeight: 'bold' }} />
                           <Bar dataKey="value" fill="#10B981" radius={[0, 10, 10, 0]} barSize={18} isAnimationActive={true} animationDuration={1200} />
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'matches' && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {allMatches.slice(0, 40).map(match => (
                 <div key={match.id} className={`p-7 rounded-[2rem] border shadow-sm hover:shadow-md transition-shadow cursor-pointer group flex flex-col justify-between h-full ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`} onClick={() => setSelectedMatch(match)}>
                    <div className="flex justify-between items-center mb-5">
                       <span className={`text-xl font-black px-4 py-1.5 rounded-2xl border ${isDarkMode ? 'text-verde-neon bg-emerald-950/20 border-emerald-900/40' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>{match.score}%</span>
                       <SynergyBadge type={match.synergyType} isDarkMode={isDarkMode} />
                    </div>
                    <div className="flex items-center gap-4 mb-6">
                       <div className="flex-1 min-w-0">
                          <p className={`font-black text-[15px] truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{match.p1.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase truncate tracking-wider">{match.p1.company}</p>
                       </div>
                       <ArrowRight className="w-5 h-5 text-gray-200" />
                       <div className="flex-1 min-w-0 text-right">
                          <p className={`font-black text-[15px] truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{match.p2.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase truncate tracking-wider">{match.p2.company}</p>
                       </div>
                    </div>
                    <p className={`text-[12px] italic leading-relaxed line-clamp-3 mt-auto p-4 rounded-2xl font-medium ${isDarkMode ? 'bg-black/20 text-gray-400' : 'bg-gray-50/50 text-gray-500'}`}>"{match.reasoning || match.reason}"</p>
                 </div>
              ))}
           </div>
        )}

        {activeTab === 'list' && (
           <div className="space-y-6 animate-fade-in">
              <div className={`relative group p-1.5 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-900 border-gray-800 focus-within:border-emerald-900' : 'bg-white border-gray-200 focus-within:border-emerald-300'}`}>
                 <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                 <input 
                    type="text" 
                    placeholder="Filtrar executivo ou corporação..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className={`w-full py-5 pl-14 pr-6 outline-none bg-transparent font-bold text-sm md:text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`} 
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
                      allConnections={unifiedConnectionsMap.get(item.p.id) || []}
                      isDarkMode={isDarkMode}
                    />
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'room' && (
           <div ref={mapContainerRef} className={`p-6 rounded-[3rem] border shadow-sm min-h-[600px] ${isDarkMode ? 'bg-chumbo-900 border-gray-800' : 'bg-white border-gray-100'}`}>
              <SeatingView data={data} isDarkMode={isDarkMode} />
           </div>
        )}
      </div>

      {selectedMatch && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => setSelectedMatch(null)}>
            <div className={`rounded-[2.5rem] w-full max-w-xl p-10 md:p-12 shadow-2xl border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`} onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-10">
                  <h3 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Tese de Conexão IN</h3>
                  <button onClick={() => setSelectedMatch(null)} className={`p-3 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}><X className="w-6 h-6 text-gray-400" /></button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                  <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-emerald-50/30 border-emerald-100'}`}>
                     <p className={`font-black text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedMatch.p1.name}</p>
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{selectedMatch.p1.company}</p>
                  </div>
                  <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50/30 border-blue-100'}`}>
                     <p className={`font-black text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedMatch.p2.name}</p>
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{selectedMatch.p2.company}</p>
                  </div>
               </div>
               <div className={`p-8 rounded-[2rem] relative ${isDarkMode ? 'bg-black/30' : 'bg-gray-50'}`}>
                  <div className="absolute -top-4 -left-4">
                     <SynergyBadge type={selectedMatch.synergyType} isDarkMode={isDarkMode} />
                  </div>
                  <Zap className="absolute -top-4 -right-4 w-10 h-10 text-emerald-400 opacity-30" />
                  <p className="text-sm md:text-base italic leading-relaxed font-semibold text-center">"{selectedMatch.reasoning || selectedMatch.reason}"</p>
               </div>
               <button onClick={() => setSelectedMatch(null)} className="w-full mt-10 py-5 bg-emerald-600 text-white font-black rounded-3xl hover:bg-emerald-700 shadow-xl uppercase tracking-[0.2em] text-[12px] md:text-sm">Prosseguir</button>
            </div>
         </div>
      )}
    </div>
  );
};

export default AnalysisView;