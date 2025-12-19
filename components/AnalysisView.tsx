import React, { useState, useMemo, useDeferredValue, useRef } from 'react';
import { AnalysisResult, Participant, LayoutFormat } from '../types';
import SeatingView from './SeatingView';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  LabelList
} from 'recharts';
import { Users, TrendingUp, Link, ArrowLeft, ArrowRight, FileSpreadsheet, Search, X, LayoutTemplate, Crown, ChevronRight, FileText, Presentation, Zap, FileDown } from 'lucide-react';
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

const formatLayoutName = (layout: string) => {
  const map: Record<string, string> = {
    'teatro': 'Teatro', 'sala_aula': 'Sala de Aula', 'mesa_o': 'Mesa em O',
    'conferencia': 'Conferência', 'mesa_u': 'Mesa em U', 'mesa_t': 'Mesa em T',
    'recepcao': 'Recepção', 'buffet': 'Buffet', 'custom': 'Livre'
  };
  return map[layout] || layout;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 rounded-xl shadow-xl border bg-white border-gray-100 text-gray-900">
        <p className="font-bold text-[10px] mb-1 border-b pb-1">{label}</p>
        <div className="text-[10px]"><span className="text-gray-500">Score:</span> <span className="font-bold text-emerald-600">{payload[0].value}%</span></div>
      </div>
    );
  }
  return null;
};

const AnalysisView: React.FC<AnalysisViewProps> = ({ data, onReset, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'matches' | 'list' | 'room'>('overview');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const deferredSearch = useDeferredValue(searchTerm);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);

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

  const handleExportXLSX = () => {
    const rows: any[] = [];
    data.individualScores.forEach(score => {
      const p = participantMap.get(score.participantId);
      if (!p) return;
      score.recommendedConnections?.forEach(conn => {
        const partner = participantMap.get(conn.partnerId);
        if (!partner) return;
        rows.push({
          "Participante": p.name,
          "Empresa": p.company,
          "Score Individual": score.score,
          "Conexão Sugerida": partner.name,
          "Score de Match": conn.score,
          "Justificativa": conn.reason
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Conexões");
    XLSX.writeFile(wb, "Rampup_IN_Relatorio.xlsx");
  };

  const captureMap = async () => {
    if (!mapContainerRef.current) return null;
    const canvas = await html2canvas(mapContainerRef.current, { scale: 2 });
    return canvas.toDataURL('image/png');
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const mapImg = await captureMap();
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [297, 167] });
      const eventName = data.participants[0]?.eventName || "Evento de Networking";

      // Capa
      doc.setFillColor(5, 150, 105);
      doc.rect(0, 0, 297, 167, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(40);
      doc.text("RAMPUP IN", 148, 70, { align: 'center' });
      doc.setFontSize(20);
      doc.text("Relatório Estratégico", 148, 85, { align: 'center' });

      // Resumo
      doc.addPage();
      doc.setTextColor(5, 150, 105);
      doc.setFontSize(24);
      doc.text("Resumo Executivo", 15, 20);
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(14);
      doc.text(`Score Geral: ${data.overallScore}%`, 15, 35);
      doc.setFontSize(11);
      const splitSummary = doc.splitTextToSize(data.summary, 260);
      doc.text(splitSummary, 15, 50);

      // Matches
      doc.addPage();
      doc.text("TOP Conexões", 15, 20);
      autoTable(doc, {
        startY: 30,
        head: [['P1', 'P2', 'Score', 'Justificativa']],
        body: allMatches.slice(0, 10).map(m => [m.p1.name, m.p2.name, `${m.score}%`, m.reason]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [5, 150, 105] }
      });

      // Mapa
      if (mapImg) {
        doc.addPage();
        doc.text("Mapa da Sala", 15, 20);
        doc.addImage(mapImg, 'PNG', 15, 30, 267, 120);
      }

      doc.save(`Rampup_IN_${eventName.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPPTX = async () => {
    setIsExporting(true);
    try {
      const mapImg = await captureMap();
      const pptx = new pptxgen();
      pptx.layout = 'LAYOUT_16x9';
      
      const slide1 = pptx.addSlide();
      slide1.background = { color: '059669' };
      slide1.addText("RAMPUP IN", { x: 0, y: 1.5, w: '100%', align: 'center', fontSize: 44, bold: true, color: 'FFFFFF' });
      
      const slide2 = pptx.addSlide();
      slide2.addText("Resumo Executivo", { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: '059669' });
      slide2.addText(data.summary, { x: 0.5, y: 1.5, w: 9, fontSize: 12 });

      if (mapImg) {
        const slide3 = pptx.addSlide();
        slide3.addText("Mapa Estratégico", { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: '059669' });
        slide3.addImage({ data: mapImg, x: 0.5, y: 1.2, w: 9, h: 4.5 });
      }

      pptx.writeFile({ fileName: "Rampup_IN_Apresentacao.pptx" });
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in mb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-100 pb-8">
        <div>
           <button onClick={onReset} className="text-[10px] font-black uppercase text-gray-400 hover:text-emerald-600 mb-2 flex items-center gap-2 transition-all">
             <ArrowLeft className="w-3 h-3" /> Nova Análise
           </button>
           <h2 className="text-3xl font-black text-gray-900">Dashboard IN</h2>
        </div>

        <div className="flex flex-wrap gap-2">
           <button onClick={handleExportXLSX} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 shadow-sm transition-all">
             <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
           </button>
           <button onClick={handleExportPDF} disabled={isExporting} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 shadow-sm transition-all disabled:opacity-50">
             <FileDown className="w-3.5 h-3.5" /> PDF (16:9)
           </button>
           <button onClick={handleExportPPTX} disabled={isExporting} className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-100 shadow-sm transition-all disabled:opacity-50">
             <Presentation className="w-3.5 h-3.5" /> PPTX
           </button>
        </div>
      </div>

      <div className="flex p-1 rounded-2xl bg-gray-100 w-fit mx-auto md:mx-0 border border-gray-200">
          {(['overview', 'matches', 'list', 'room'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>
              {tab === 'overview' ? 'Geral' : tab === 'matches' ? 'TOP Conexões' : tab === 'list' ? 'Lista' : 'Mapa'}
            </button>
          ))}
      </div>

      <div className="min-h-[600px]">
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                   <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Score Geral</p>
                   <h3 className="text-3xl font-black text-emerald-600">{data.overallScore}%</h3>
                </div>
                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                   <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Participantes</p>
                   <h3 className="text-3xl font-black text-gray-900">{data.participants.length}</h3>
                </div>
                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                   <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Layout Ideal</p>
                   <h3 className="text-xl font-black text-gray-900 mt-1">{formatLayoutName(data.suggestedLayout)}</h3>
                </div>
                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                   <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Foco Crítico</p>
                   <h3 className="text-3xl font-black text-amber-500">{allMatches.filter(m => m.score >= 85).length}</h3>
                </div>
             </div>

             <div className="bg-emerald-50/50 p-8 rounded-3xl border-2 border-dashed border-emerald-100">
                <h3 className="text-xs font-black text-emerald-800 uppercase mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Resumo Estratégico
                </h3>
                <p className="text-sm font-medium leading-relaxed text-gray-700">"{data.summary}"</p>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                   <h3 className="text-xs font-black text-gray-400 uppercase mb-6 tracking-widest">Sinergia Individual</h3>
                   <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sortedIndividuals} layout="vertical" margin={{ left: 10, right: 30 }}>
                          <XAxis type="number" hide domain={[0, 100]} />
                          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                          <Bar dataKey="score" fill="#10B981" radius={[0, 8, 8, 0]} barSize={16}>
                             {sortedIndividuals.map((_, i) => <Cell key={i} fill={i === 0 ? '#059669' : '#10B981'} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                   <h3 className="text-xs font-black text-gray-400 uppercase mb-6 tracking-widest">Setores em Destaque</h3>
                   <div className="grid grid-cols-2 gap-4 max-h-[350px] overflow-y-auto no-scrollbar pr-2">
                      {sortedSegments.map((s, idx) => (
                        <div key={idx} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex justify-between items-center transition-all hover:border-emerald-200">
                           <span className="text-[10px] font-black uppercase text-gray-500">{s.name}</span>
                           <span className="text-base font-black text-emerald-600">{s.value}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'matches' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
              {allMatches.slice(0, 24).map(match => (
                 <div key={match.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setSelectedMatch(match)}>
                    <div className="flex justify-between items-center mb-4">
                       <span className="text-2xl font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl">{match.score}%</span>
                       <Zap className="w-4 h-4 text-gray-200 group-hover:text-emerald-300" />
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                       <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 truncate">{match.p1.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase truncate">{match.p1.company}</p>
                       </div>
                       <ArrowRight className="w-4 h-4 text-gray-200" />
                       <div className="flex-1 min-w-0 text-right">
                          <p className="font-bold text-gray-900 truncate">{match.p2.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase truncate">{match.p2.company}</p>
                       </div>
                    </div>
                    <p className="text-[11px] italic text-gray-500 leading-relaxed line-clamp-2">"{match.reason}"</p>
                 </div>
              ))}
           </div>
        )}

        {activeTab === 'list' && (
           <div className="space-y-6 animate-fade-in">
              <div className="relative group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-emerald-500 transition-colors" />
                 <input type="text" placeholder="Buscar por nome ou empresa..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 ring-emerald-500/10 transition-all font-medium text-sm" />
              </div>
              <div className="grid grid-cols-1 gap-3">
                 {fullList.map(item => (
                    <div key={item.p.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-emerald-200 transition-all">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex flex-col items-center justify-center text-emerald-700 shadow-sm">
                             <span className="text-lg font-black">{item.score.score}</span>
                             <span className="text-[6px] font-black uppercase opacity-60">IN</span>
                          </div>
                          <div className="flex-1 min-w-0">
                             <h4 className="font-bold text-sm text-gray-800 flex items-center gap-2">{item.p.name} {item.p.isHost && <Crown className="w-3 h-3 text-amber-500" />}</h4>
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.p.company} • {item.p.segment}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-200" />
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'room' && (
           <div ref={mapContainerRef} className="bg-white p-4 rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
              <SeatingView data={data} isDarkMode={false} />
           </div>
        )}
      </div>

      {selectedMatch && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedMatch(null)}>
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl border border-gray-100" onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-black text-gray-900">Análise de Sinergia</h3>
                  <button onClick={() => setSelectedMatch(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
               </div>
               <div className="flex items-center gap-4 mb-8">
                  <div className="text-4xl font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-2xl">{selectedMatch.score}%</div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Match Inteligente</div>
               </div>
               <div className="space-y-4 mb-8">
                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                     <p className="text-[9px] font-black text-emerald-700 uppercase mb-1">Empresa A</p>
                     <p className="font-bold text-gray-900">{selectedMatch.p1.name}</p>
                     <p className="text-[10px] text-gray-500 font-bold">{selectedMatch.p1.company} • {selectedMatch.p1.segment}</p>
                  </div>
                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 text-right">
                     <p className="text-[9px] font-black text-emerald-700 uppercase mb-1">Empresa B</p>
                     <p className="font-bold text-gray-900">{selectedMatch.p2.name}</p>
                     <p className="text-[10px] text-gray-500 font-bold">{selectedMatch.p2.company} • {selectedMatch.p2.segment}</p>
                  </div>
               </div>
               <div className="p-6 border-2 border-dashed border-emerald-100 rounded-3xl bg-emerald-50/30">
                  <p className="text-sm italic text-gray-700 leading-relaxed font-medium">"{selectedMatch.reason}"</p>
               </div>
               <button onClick={() => setSelectedMatch(null)} className="w-full mt-8 py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-colors shadow-xl shadow-emerald-600/20 uppercase tracking-widest text-xs">Fechar</button>
            </div>
         </div>
      )}
    </div>
  );
};

export default AnalysisView;