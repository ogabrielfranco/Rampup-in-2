
import React, { useState, useMemo, useDeferredValue, useEffect, useCallback } from 'react';
import { AnalysisResult, Participant, IndividualScore, LayoutFormat } from '../types';
import SeatingView from './SeatingView';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  CartesianGrid, LabelList
} from 'recharts';
import { Users, TrendingUp, Link, ArrowLeft, ArrowRight, FileSpreadsheet, List, Layers, Search, Building2, X, Briefcase, LayoutTemplate, Crown, Download, ChevronRight, FileText, Presentation, ChevronDown, ChevronUp } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import pptxgen from 'pptxgenjs';
import { LOGO_URL } from '../App';

interface AnalysisViewProps {
  data: AnalysisResult;
  onReset: () => void;
  isDarkMode: boolean;
}

const INITIAL_TOP_MATCHES = 15;

const formatLayoutName = (layout: string) => {
  const map: Record<string, string> = {
    'teatro': 'Teatro', 'sala_aula': 'Sala de Aula', 'mesa_o': 'Mesa em O',
    'conferencia': 'Conferência', 'mesa_u': 'Mesa em U', 'mesa_t': 'Mesa em T',
    'recepcao': 'Recepção', 'buffet': 'Buffet', 'custom': 'Livre'
  };
  return map[layout] || layout;
};

const CustomTooltip = ({ active, payload, label, isDarkMode }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0];
    return (
      <div className={`p-4 rounded-xl shadow-2xl border backdrop-blur-md ${isDarkMode ? 'bg-gray-900/95 border-gray-700 text-white' : 'bg-white/95 border-gray-100 text-gray-900'}`}>
        <p className="font-bold text-sm mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">{label}</p>
        <div className="flex items-center gap-3 text-sm">
          <span className={`flex-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Índice (IN):</span>
          <span className="font-bold font-mono text-lg">{dataPoint.value}%</span>
        </div>
      </div>
    );
  }
  return null;
};

const MetricCard = ({ title, value, subtext, icon: Icon, isDarkMode, accentColor, trend }: any) => (
  <div className={`relative overflow-hidden p-6 rounded-2xl border shadow-lg group ${isDarkMode ? 'bg-chumbo-900 border-gray-800' : 'bg-white border-gray-100'}`}>
    <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 rounded-full opacity-5 group-hover:opacity-10 transition-opacity ${accentColor}`}></div>
    <div className="relative z-10">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <Icon className={`w-6 h-6 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} />
        </div>
        {trend && (
           <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trend.isPositive ? 'bg-emerald-50 text-emerald-700 dark:bg-green-900/30' : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30'}`}>
             {trend.text}
           </span>
        )}
      </div>
      <div>
        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{title}</p>
        <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value}</h3>
        {subtext && <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{subtext}</p>}
      </div>
    </div>
  </div>
);

const AnalysisView: React.FC<AnalysisViewProps> = ({ data, onReset, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'matches' | 'list' | 'room'>('overview');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingPPTX, setIsExportingPPTX] = useState(false);
  const [visibleTopMatches, setVisibleTopMatches] = useState(INITIAL_TOP_MATCHES);
  
  const [currentLayout, setCurrentLayout] = useState<LayoutFormat>(() => {
      const saved = localStorage.getItem('rampup_saved_layout');
      return (saved as LayoutFormat) || data.suggestedLayout;
  });

  const [filterSegment, setFilterSegment] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const participantMap = useMemo(() => {
    const map = new Map<string, Participant>();
    data.participants.forEach(p => map.set(p.id, p));
    return map;
  }, [data.participants]);

  const uniqueSegments = useMemo(() => {
    return Array.from(new Set(data.participants.map(p => p.segment))).sort();
  }, [data.participants]);

  const toggleRow = useCallback((id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleLayoutChange = (layout: LayoutFormat) => {
    setCurrentLayout(layout);
  };

  const allMatches = useMemo(() => {
    const matches: any[] = [];
    data.individualScores.forEach(score => {
      const p1 = participantMap.get(score.participantId);
      if (!p1) return;
      score.recommendedConnections?.forEach(rec => {
        const p2 = participantMap.get(rec.partnerId);
        if (p2) {
          matches.push({ p1, p2, score: rec.score, reason: rec.reason, id: `${p1.id}-${p2.id}` });
        }
      });
    });
    return matches.sort((a, b) => b.score - a.score);
  }, [data.individualScores, participantMap]);

  const topMatchesVisible = useMemo(() => allMatches.slice(0, visibleTopMatches), [allMatches, visibleTopMatches]);

  const fullList = useMemo(() => {
    let list = [...data.individualScores];
    if (deferredSearchTerm) {
      const term = deferredSearchTerm.toLowerCase();
      list = list.filter(s => {
        const p = participantMap.get(s.participantId);
        return p?.name.toLowerCase().includes(term) || p?.company.toLowerCase().includes(term);
      });
    }
    if (filterSegment) {
      list = list.filter(s => participantMap.get(s.participantId)?.segment === filterSegment);
    }
    return list.sort((a, b) => b.score - a.score);
  }, [data.individualScores, deferredSearchTerm, filterSegment, participantMap]);

  const sortedSegments = useMemo(() => [...data.segmentDistribution].sort((a,b) => b.value - a.value), [data.segmentDistribution]);
  const sortedIndividuals = useMemo(() => [...data.individualScores]
    .sort((a, b) => b.score - a.score)
    .map(s => {
      const p = participantMap.get(s.participantId);
      return { name: p?.name || '?', score: s.score };
    }).slice(0, 10), [data.individualScores, participantMap]);

  const handleExportXLSX = () => {
    const rows = allMatches.map(m => ({
      "Score Sinergia": `${m.score}%`,
      "Participante 1": m.p1.name,
      "Empresa 1": m.p1.company,
      "Colaboradores 1": m.p1.employeeCount || 'N/A',
      "Segmento 1": m.p1.segment,
      "Participante 2": m.p2.name,
      "Empresa 2": m.p2.company,
      "Colaboradores 2": m.p2.employeeCount || 'N/A',
      "Segmento 2": m.p2.segment,
      "Justificativa Estratégica": m.reason
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Conexões");
    XLSX.writeFile(wb, `Rampup_IN_Conexoes_${data.participants[0]?.eventName || 'Evento'}.xlsx`);
  };

  const handleExportPPTX = async () => {
    setIsExportingPPTX(true);
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    const eventName = data.participants[0]?.eventName || "Evento de Networking";
    const FONT = 'Montserrat';

    // 1. Capa
    let slide1 = pptx.addSlide();
    slide1.background = { color: 'FFFFFF' };
    slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '4%', h: '100%', fill: { color: '064E3B' } });
    slide1.addText("RELATÓRIO DE CONEXÕES ESTRATÉGICAS", { x: '8%', y: '25%', w: '80%', fontSize: 36, bold: true, color: '1e1e1e', fontFace: FONT });
    slide1.addText("Rampup Business Index (IN)", { x: '8%', y: '35%', w: '80%', fontSize: 20, color: '10B981', bold: true, fontFace: FONT });
    slide1.addText(eventName, { x: '8%', y: '50%', w: '80%', fontSize: 24, color: '505050', fontFace: FONT });
    slide1.addText(`EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}`, { x: '8%', y: '85%', fontSize: 12, color: '969696', fontFace: FONT });

    // 2. Resumo Executivo
    let slide2 = pptx.addSlide();
    slide2.addText("DASHBOARD - RESUMO EXECUTIVO", { x: 0.5, y: 0.3, w: '90%', fontSize: 28, bold: true, color: '064E3B', fontFace: FONT });
    slide2.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.8, w: 9.0, h: 0.02, fill: { color: '10B981' } });
    slide2.addText(data.summary, { x: 0.5, y: 1.1, w: 9.0, fontSize: 14, color: '4b5563', italic: true, fontFace: FONT });

    const cardW = 2.15, cardH = 1.3, cardY = 2.2, spacing = 0.13;
    const addMetric = (x: number, title: string, val: string, color: string) => {
      slide2.addShape(pptx.ShapeType.rect, { x, y: cardY, w: cardW, h: cardH, fill: { color: 'F9FAFB' }, line: { color: 'E5E7EB', pt: 1 } });
      slide2.addText(title, { x: x + 0.1, y: cardY + 0.2, fontSize: 9, bold: true, color: '94A3B8', fontFace: FONT });
      slide2.addText(val, { x: x + 0.1, y: cardY + 0.6, fontSize: 34, bold: true, color, fontFace: FONT });
    };
    addMetric(0.5, "ÍNDICE GERAL (IN)", `${data.overallScore}%`, '059669');
    addMetric(0.5 + cardW + spacing, "PARTICIPANTES", data.participants.length.toString(), '1E3A8A');
    addMetric(0.5 + (cardW + spacing)*2, "CONEXÕES CHAVE", allMatches.filter(m => m.score >= 80).length.toString(), '581C87');
    addMetric(0.5 + (cardW + spacing)*3, "FORMATO IDEAL", formatLayoutName(currentLayout), 'D97706');

    slide2.addText("DISTRIBUIÇÃO SETORIAL PREDOMINANTE", { x: 0.5, y: 3.8, fontSize: 16, bold: true, color: '064E3B', fontFace: FONT });
    const segmentsRow = sortedSegments.slice(0, 10).map(s => `${s.name} (${s.value})`).join('  |  ');
    slide2.addText(segmentsRow, { x: 0.5, y: 4.3, w: 9.0, fontSize: 10, color: '444444', fontFace: FONT });

    // 3. TOP Conexões
    let slide3 = pptx.addSlide();
    slide3.addText("TOP CONEXÕES ESTRATÉGICAS", { x: 0.5, y: 0.3, fontSize: 28, bold: true, color: '064E3B', fontFace: FONT });
    let topTable: any[][] = [[
      { text: "MATCH", options: { fill: '064E3B', color: 'FFFFFF', bold: true, align: 'center', fontFace: FONT } },
      { text: "PARTICIPANTE A (EMPRESA / COLAB.)", options: { fill: '064E3B', color: 'FFFFFF', bold: true, fontFace: FONT } },
      { text: "PARTICIPANTE B (EMPRESA / COLAB.)", options: { fill: '064E3B', color: 'FFFFFF', bold: true, fontFace: FONT } },
      { text: "JUSTIFICATIVA ESTRATÉGICA", options: { fill: '064E3B', color: 'FFFFFF', bold: true, fontFace: FONT } }
    ]];
    allMatches.slice(0, 10).forEach(m => {
      topTable.push([
        { text: `${m.score}%`, options: { color: '10B981', bold: true, align: 'center', fontFace: FONT } },
        { text: `${m.p1.name}\n${m.p1.company} (${m.p1.employeeCount || 'N/A'} colab.)`, options: { fontSize: 9, fontFace: FONT } },
        { text: `${m.p2.name}\n${m.p2.company} (${m.p2.employeeCount || 'N/A'} colab.)`, options: { fontSize: 9, fontFace: FONT } },
        { text: m.reason, options: { fontSize: 8, italic: true, fontFace: FONT } }
      ]);
    });
    slide3.addTable(topTable, { x: 0.5, y: 1.0, w: 9.0, border: { pt: 0.5, color: 'E2E8F0' } });

    // 4. Lista Completa
    let slide4 = pptx.addSlide();
    slide4.addText("MATRIZ COMPLETA DE NEGÓCIOS", { x: 0.5, y: 0.3, fontSize: 28, bold: true, color: '064E3B', fontFace: FONT });
    let fullTableData: any[][] = [[
      { text: "IN", options: { fill: 'F3F4F6', bold: true, align: 'center', fontFace: FONT } },
      { text: "NOME", options: { fill: 'F3F4F6', bold: true, fontFace: FONT } },
      { text: "EMPRESA", options: { fill: 'F3F4F6', bold: true, fontFace: FONT } },
      { text: "COLAB.", options: { fill: 'F3F4F6', bold: true, fontFace: FONT } },
      { text: "SEGMENTO", options: { fill: 'F3F4F6', bold: true, fontFace: FONT } }
    ]];
    fullList.slice(0, 22).forEach(s => {
      const p = participantMap.get(s.participantId)!;
      fullTableData.push([
        { text: `${s.score}%`, options: { bold: true, align: 'center', fontFace: FONT } },
        { text: p.name, options: { fontFace: FONT } },
        { text: p.company, options: { fontFace: FONT } },
        { text: p.employeeCount || 'N/A', options: { fontFace: FONT } },
        { text: p.segment, options: { fontFace: FONT } }
      ]);
    });
    slide4.addTable(fullTableData, { x: 0.5, y: 1.0, w: 9.0, fontSize: 8 });
    if (fullList.length > 22) {
       slide4.addText(`+ ${fullList.length - 22} participantes. Visualização parcial em PPTX. Ver PDF completo.`, { x: 0.5, y: 5.4, fontSize: 8, color: '999999', fontFace: FONT });
    }

    // 5. Mapa da Sala
    const mapElement = document.getElementById('seating-map-export');
    if (mapElement) {
      try {
        const canvas = await html2canvas(mapElement, { 
          scale: 4, 
          useCORS: true, 
          backgroundColor: '#ffffff',
          width: 1440, // Fixed capture width to prevent distortion
          height: 900
        });
        const imgData = canvas.toDataURL('image/png');
        let slide5 = pptx.addSlide();
        slide5.addText(`MAPA ESTRATÉGICO DE SALA (${formatLayoutName(currentLayout)})`, { x: 0.5, y: 0.3, fontSize: 26, bold: true, color: '064E3B', fontFace: FONT });
        slide5.addImage({ data: imgData, x: 0.5, y: 1.0, w: 9.0, h: 5.5, sizing: { type: 'contain' } });
      } catch (err) {}
    }

    pptx.writeFile({ fileName: `Rampup_IN_Apresentacao_${eventName.replace(/\s+/g, '_')}.pptx` });
    setIsExportingPPTX(false);
  };

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4', unit: 'mm' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const FONT = 'helvetica';
    
    // 1. Capa
    doc.setFillColor(6, 78, 59);
    doc.rect(0, 0, 12, 210, 'F');
    doc.setFont(FONT, 'bold');
    doc.setFontSize(40);
    doc.setTextColor(30);
    doc.text("RELATÓRIO ESTRATÉGICO", 30, 80);
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129);
    doc.text("Rampup Business Index (IN)", 30, 93);
    doc.setFontSize(18);
    doc.setTextColor(100);
    doc.text(data.participants[0]?.eventName || "Evento de Networking", 30, 108);
    
    // 2. Resumo Executivo
    doc.addPage();
    doc.setTextColor(6, 78, 59);
    doc.setFontSize(26);
    doc.text("Resumo Executivo", 15, 25);
    doc.setFontSize(12);
    doc.setFont(FONT, 'normal');
    doc.setTextColor(60);
    const splitSummary = doc.splitTextToSize(data.summary, pageWidth - 30);
    doc.text(splitSummary, 15, 38);
    
    autoTable(doc, {
      startY: 60,
      head: [['Índice Geral (IN)', 'Participantes', 'Conexões Chave', 'Layout Sugerido']],
      body: [[`${data.overallScore}%`, data.participants.length, allMatches.filter(m => m.score >= 80).length, formatLayoutName(currentLayout)]],
      theme: 'grid',
      headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontSize: 13, halign: 'center' },
      bodyStyles: { fontSize: 16, fontStyle: 'bold', halign: 'center', textColor: [30, 58, 138] },
      margin: { left: 15, right: 15 }
    });

    // 3. TOP Matches
    doc.addPage();
    doc.setTextColor(6, 78, 59);
    doc.setFontSize(24);
    doc.text("Top Conexões Sugeridas", 15, 20);
    autoTable(doc, {
      startY: 30,
      head: [['IN', 'Participante A', 'Participante B', 'Justificativa de Negócio']],
      body: allMatches.slice(0, 30).map(m => [
        `${m.score}%`, 
        `${m.p1.name}\n${m.p1.company}\n(${m.p1.employeeCount || 'N/A'} colab.)`, 
        `${m.p2.name}\n${m.p2.company}\n(${m.p2.employeeCount || 'N/A'} colab.)`, 
        m.reason
      ]),
      columnStyles: { 0: { halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129] }, 3: { cellWidth: 110 } },
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [6, 78, 59] }
    });

    // 4. Lista Completa
    doc.addPage();
    doc.text("Lista Completa de Participantes", 15, 20);
    autoTable(doc, {
      startY: 30,
      head: [['Score', 'Nome', 'Empresa', 'Colab.', 'Segmento']],
      body: fullList.map(s => {
        const p = participantMap.get(s.participantId)!;
        return [`${s.score}%`, p.name, p.company, p.employeeCount || 'N/A', p.segment];
      }),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [75, 85, 99] }
    });

    // 5. Mapa
    const mapElement = document.getElementById('seating-map-export');
    if (mapElement) {
       doc.addPage();
       doc.text("Mapa Estratégico de Sala", 15, 20);
       const canvas = await html2canvas(mapElement, { 
         scale: 3, 
         useCORS: true, 
         backgroundColor: '#ffffff',
         width: 1440,
         height: 900
       });
       // Scale to fit landscape A4
       const imgWidth = pageWidth - 30;
       const imgHeight = (canvas.height * imgWidth) / canvas.width;
       doc.addImage(canvas.toDataURL('image/png'), 'PNG', 15, 30, imgWidth, imgHeight);
    }

    doc.save(`Relatorio_Rampup_IN_${data.participants[0]?.eventName || 'Networking'}.pdf`);
    setIsExportingPDF(false);
  };

  return (
    <div className="space-y-8 px-2 md:px-0">
      {/* EXPORT CONTAINER (FORCED HIGH CONTRAST & NO DISTORTION) */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '1440px', height: '900px', visibility: 'visible', zIndex: -1, background: 'white' }} id="seating-map-export">
         <div className="p-16 bg-white text-black font-sans h-full flex flex-col justify-between">
            <div>
              <h1 className="text-4xl font-extrabold mb-2 text-emerald-900">MAPA ESTRATÉGICO DE ASSENTOS</h1>
              <p className="text-xl text-emerald-600 mb-8 font-bold border-b-2 border-emerald-100 pb-4">Planejamento de Conexões Inteligentes</p>
              <div className="border-4 border-gray-100 p-10 rounded-[40px] shadow-2xl bg-white flex-1 min-h-[500px]">
                 <SeatingView data={data} isDarkMode={false} readOnly={true} overrideLayout={currentLayout} />
              </div>
            </div>
            <div className="mt-8 flex justify-between items-end">
               <div className="space-y-2">
                  <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Configuração do Evento</p>
                  <p className="text-2xl font-black text-gray-800 uppercase">{formatLayoutName(currentLayout)}</p>
                  <p className="text-gray-500 font-medium">Total de {data.participants.length} decisores mapeados.</p>
               </div>
               <img src={LOGO_URL} className="h-16 object-contain" alt="Rampup Logo" />
            </div>
         </div>
      </div>

      {/* Main Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div>
          <button onClick={onReset} className={`text-sm flex items-center mb-3 transition-colors font-medium ${isDarkMode ? 'text-gray-400 hover:text-verde-light' : 'text-gray-500 hover:text-emerald-600'}`}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Nova Análise
          </button>
          <div className="flex flex-col xl:flex-row xl:items-center gap-4">
            <h2 className={`text-2xl md:text-3xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Dashboard de Conexões</h2>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleExportPPTX} disabled={isExportingPPTX} className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border shadow-sm transition-all hover:-translate-y-0.5 ${isDarkMode ? 'bg-chumbo-800 border-gray-700 text-orange-400 hover:bg-chumbo-900' : 'bg-white border-gray-200 text-orange-700 hover:bg-gray-50'}`}>
                {isExportingPPTX ? <div className="animate-spin h-3 w-3 border-b-2 border-current rounded-full" /> : <Presentation className="w-3 h-3" />}
                PPTX
              </button>
              <button onClick={handleExportPDF} disabled={isExportingPDF} className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border shadow-sm transition-all hover:-translate-y-0.5 ${isDarkMode ? 'bg-chumbo-800 border-gray-700 text-blue-400 hover:bg-chumbo-900' : 'bg-white border-gray-200 text-blue-700 hover:bg-gray-50'}`}>
                {isExportingPDF ? <div className="animate-spin h-3 w-3 border-b-2 border-current rounded-full" /> : <FileText className="w-3 h-3" />}
                PDF
              </button>
              <button onClick={handleExportXLSX} className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border shadow-sm transition-all hover:-translate-y-0.5 ${isDarkMode ? 'bg-chumbo-800 border-gray-700 text-emerald-400 hover:bg-chumbo-900' : 'bg-white border-gray-200 text-emerald-700 hover:bg-gray-50'}`}>
                <FileSpreadsheet className="w-3 h-3" /> EXCEL
              </button>
            </div>
          </div>
          <p className={`text-sm md:text-base mt-2 max-w-4xl leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{data.summary}</p>
        </div>
        
        <div className={`flex p-1.5 rounded-xl self-start md:self-center overflow-x-auto max-w-full ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100'}`}>
          {(['overview', 'matches', 'list', 'room'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 md:px-5 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab ? (isDarkMode ? 'bg-chumbo-900 text-verde-light shadow-md' : 'bg-white text-emerald-600 shadow-sm') : (isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')}`}>
              {tab === 'overview' && 'Visão Geral'}
              {tab === 'matches' && 'Top Conexões'}
              {tab === 'list' && 'Lista Completa'}
              {tab === 'room' && 'Mapa de Sala'}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
               <MetricCard title="Índice Geral (IN)" value={`${data.overallScore}%`} icon={TrendingUp} isDarkMode={isDarkMode} accentColor="bg-emerald-500" trend={{ isPositive: data.overallScore >= 75, text: data.overallScore >= 75 ? 'Alto Potencial' : 'Regular' }} />
               <MetricCard title="Participantes" value={data.participants.length} icon={Users} isDarkMode={isDarkMode} accentColor="bg-blue-500" />
               <MetricCard title="Conexões Chave" value={allMatches.filter(m => m.score >= 80).length} icon={Link} isDarkMode={isDarkMode} accentColor="bg-purple-500" />
               <MetricCard title="Formato Ideal" value={formatLayoutName(currentLayout)} icon={LayoutTemplate} isDarkMode={isDarkMode} accentColor="bg-orange-500" />
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className={`p-6 rounded-2xl border shadow-lg ${isDarkMode ? 'bg-chumbo-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                  <h3 className="text-xl font-bold mb-6">Top 10 Potencial Individual</h3>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sortedIndividuals} layout="vertical" margin={{ left: 20, right: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDarkMode ? '#374151' : '#E5E7EB'} />
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: isDarkMode ? '#D1D5DB' : '#4B5563' }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} />
                        <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                          {sortedIndividuals.map((entry, idx) => <Cell key={idx} fill={entry.score > 85 ? '#059669' : '#10B981'} />)}
                          <LabelList dataKey="score" position="right" formatter={(v: any) => `${v}%`} fontSize={10} fill={isDarkMode ? '#9CA3AF' : '#6B7280'} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               <div className={`p-6 rounded-2xl border shadow-lg ${isDarkMode ? 'bg-chumbo-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                  <h3 className="text-xl font-bold mb-6">Distribuição Setorial</h3>
                  <div className="grid grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {sortedSegments.map((s, idx) => (
                      <div key={idx} className={`p-4 rounded-xl border flex flex-col justify-between h-28 ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex justify-between items-start">
                          <span className="text-2xl font-bold">{s.value}</span>
                          <span className="text-[10px] font-bold opacity-50">{Math.round((s.value/data.participants.length)*100)}%</span>
                        </div>
                        <p className="text-[11px] font-medium leading-tight line-clamp-2">{s.name}</p>
                      </div>
                    ))}
                  </div>
               </div>
             </div>
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="space-y-4 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topMatchesVisible.map(match => (
                  <div key={match.id} className={`p-5 rounded-xl border flex items-start gap-4 hover:shadow-md transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className={`text-2xl font-bold w-16 text-center shrink-0 ${match.score >= 90 ? 'text-emerald-500' : 'text-gray-400'}`}>{match.score}%</div>
                    <div className="flex-1 min-w-0">
                       <div className="flex flex-col md:flex-row md:items-center gap-2 mb-3 font-bold text-sm">
                          <div className="flex-1 min-w-0">
                             <div className="truncate text-base">{match.p1.name}</div>
                             <div className="text-[10px] opacity-60 font-semibold uppercase tracking-wider truncate">{match.p1.company} • {match.p1.employeeCount || 'N/A'} colab. • {match.p1.segment}</div>
                          </div>
                          <ArrowRight className="w-3 h-3 opacity-30 shrink-0 hidden md:block" />
                          <div className="flex-1 min-w-0 md:text-right">
                             <div className="truncate text-base">{match.p2.name}</div>
                             <div className="text-[10px] opacity-60 font-semibold uppercase tracking-wider truncate">{match.p2.company} • {match.p2.employeeCount || 'N/A'} colab. • {match.p2.segment}</div>
                          </div>
                       </div>
                       <p className="text-xs italic p-3 rounded-lg bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400 border border-transparent dark:border-gray-800">
                         "{match.reason}"
                       </p>
                    </div>
                  </div>
                ))}
             </div>
             {visibleTopMatches < allMatches.length && (
                <div className="text-center py-10">
                   <button 
                     onClick={() => setVisibleTopMatches(prev => prev + 25)} 
                     className={`flex items-center gap-2 mx-auto px-8 py-3 rounded-full font-bold text-sm border transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-verde-light hover:bg-gray-700' : 'bg-white border-gray-200 text-emerald-700 hover:bg-gray-50 hover:shadow-md'}`}
                   >
                     Ver Mais Conexões <ChevronDown className="w-4 h-4" />
                   </button>
                </div>
             )}
          </div>
        )}

        {activeTab === 'list' && (
          <div className="space-y-4 animate-fade-in">
             <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className={`flex-1 relative rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                   <Search className="absolute left-3 top-3 w-4 h-4 opacity-40" />
                   <input type="text" placeholder="Buscar por nome ou empresa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-transparent outline-none text-sm" />
                </div>
                <select value={filterSegment} onChange={(e) => setFilterSegment(e.target.value)} className={`px-4 py-2 rounded-lg text-sm border font-medium outline-none focus:ring-1 focus:ring-emerald-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'}`}>
                    <option value="">Todos os Segmentos</option>
                    {uniqueSegments.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
             </div>
             <div className="grid grid-cols-1 gap-3">
                {fullList.map(score => {
                   const p = participantMap.get(score.participantId);
                   if (!p) return null;
                   const expanded = expandedRows.has(p.id);
                   return (
                      <div key={p.id} className={`rounded-xl border transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'} ${expanded ? 'ring-2 ring-emerald-500/50' : 'hover:border-emerald-200'}`}>
                         <div onClick={() => toggleRow(p.id)} className="p-4 cursor-pointer flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center text-xs font-bold shrink-0 ${p.isHost ? 'bg-amber-400 text-white shadow-md' : 'bg-emerald-100 text-emerald-700'}`}>
                               <span className="text-lg">{score.score}</span>
                               <span className="text-[7px] uppercase tracking-tighter">Índice IN</span>
                            </div>
                            <div className="flex-1 min-w-0">
                               <h4 className="font-bold truncate text-sm flex items-center gap-2">
                                 {p.name} {p.isHost && <Crown className="w-3 h-3 text-amber-500" />}
                               </h4>
                               <p className="text-xs opacity-60 truncate">{p.company} • {p.employeeCount ? `${p.employeeCount} colab.` : 'N/A colab.'} • {p.segment}</p>
                            </div>
                            <div className="flex items-center gap-4">
                               <div className="text-right hidden sm:block">
                                  <div className="text-[10px] font-bold uppercase opacity-40">Conexões</div>
                                  <div className="text-sm font-bold">{score.recommendedConnections?.length || 0}</div>
                               </div>
                               <ChevronRight className={`w-5 h-5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                            </div>
                         </div>
                         {expanded && (
                           <div className="border-t p-5 bg-gray-50/50 dark:bg-gray-900/20 space-y-4">
                             <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Matriz de Sinergia Sugerida</p>
                                <span className="text-[10px] opacity-40 italic">Análise de IA Otimizada</span>
                             </div>
                             {score.recommendedConnections?.map((rec, i) => (
                               <div key={i} className="text-xs p-4 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between gap-6 shadow-sm">
                                 <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-bold block text-sm">{participantMap.get(rec.partnerId)?.name}</span>
                                      <span className="text-[10px] opacity-40 font-normal">({participantMap.get(rec.partnerId)?.company})</span>
                                    </div>
                                    <span className="opacity-70 italic leading-relaxed">"{rec.reason}"</span>
                                 </div>
                                 <div className="text-emerald-600 font-bold self-center text-sm px-2 py-1 bg-emerald-50 rounded-lg">{rec.score}%</div>
                               </div>
                             ))}
                             {!score.recommendedConnections?.length && <p className="text-xs opacity-50 italic text-center py-2">Sem recomendações específicas para este perfil.</p>}
                           </div>
                         )}
                      </div>
                   );
                })}
             </div>
          </div>
        )}

        {activeTab === 'room' && <SeatingView data={data} isDarkMode={isDarkMode} onLayoutChange={handleLayoutChange} />}
      </div>
    </div>
  );
};

export default AnalysisView;
