import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AnalysisResult, LayoutFormat, Participant } from '../types';
// Removido o ícone 'Grid' que não estava sendo utilizado e causava erro de build
import { LayoutDashboard, Users, User, Monitor, Disc, Rows, RectangleHorizontal, Magnet, AlignJustify, Save, Circle, Square, Flower, ZoomIn, ZoomOut, Settings2, Trash2, Crown, MousePointerClick, Eraser, Check, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';

interface SeatingViewProps {
  data: AnalysisResult;
  isDarkMode: boolean;
  readOnly?: boolean;
  overrideLayout?: LayoutFormat;
  onLayoutChange?: (layout: LayoutFormat) => void;
}

const LAYOUT_OPTIONS: { id: LayoutFormat; label: string; icon: any; description: string }[] = [
  { id: 'custom', label: 'Livre / Personalizado', icon: MousePointerClick, description: 'Crie seu próprio layout adicionando objetos e assentos.' },
  { id: 'sala_aula', label: 'Sala de Aula', icon: Monitor, description: 'Fileiras com mesas. Foco em aprendizado.' },
  { id: 'mesa_o', label: 'Mesa em O', icon: LayoutDashboard, description: 'Quadrado vazado. Similar ao U, mas fechado.' },
  { id: 'buffet', label: 'Buffet / Banquete', icon: Disc, description: 'Mesas redondas para 6-8 pessoas. Ideal para networking intenso.' },
  { id: 'mesa_u', label: 'Mesa em U', icon: Magnet, description: 'Formato de U. Todos se veem, bom para debates centrais.' },
  { id: 'conferencia', label: 'Conferência', icon: RectangleHorizontal, description: 'Mesa única retangular. Ideal para diretoria ou grupos menores.' },
  { id: 'teatro', label: 'Teatro', icon: Rows, description: 'Fileiras de cadeiras. Foco no palestrante.' },
  { id: 'recepcao', label: 'Recepção', icon: Users, description: 'Mesas de apoio e circulação livre.' },
  { id: 'mesa_t', label: 'Mesa em T', icon: AlignJustify, description: 'Formato T. Bom para painéis com destaque principal.' },
];

interface SeatCardProps {
  p: Participant;
  idx: number;
  isDarkMode: boolean;
  isDimmed: boolean;
  score?: number;
}

const SeatCard: React.FC<SeatCardProps> = ({ p, idx, isDarkMode, isDimmed, score }) => (
  <div className={`flex items-center gap-2 p-2 rounded-lg border-2 w-full mb-2 transition-opacity duration-300 relative ${
     isDimmed ? 'opacity-20 grayscale' : 'opacity-100'
  } ${
     p.isHost 
      ? 'bg-amber-100 border-amber-400 shadow-md transform scale-[1.02]' 
      : isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300 shadow-sm'
  }`}>
     {p.isHost && (
       <div className="absolute -top-2 -right-2 bg-amber-500 text-white p-1 rounded-full shadow-md z-10 border border-white">
         <Crown className="w-3 h-3" />
       </div>
     )}
     <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${
        p.isHost 
          ? 'bg-amber-600 text-white' 
          : isDarkMode ? 'bg-gray-800 text-verde-light' : 'bg-emerald-600 text-white'
     }`}>{idx}</div>
     <div className="min-w-0">
       <div className={`text-xs font-extrabold truncate ${isDarkMode && !p.isHost ? 'text-gray-100' : 'text-gray-900'}`}>{p.name}</div>
       <div className="flex items-center gap-2">
          <div className={`text-[10px] font-semibold truncate ${isDarkMode && !p.isHost ? 'text-gray-400' : 'text-gray-600'}`}>{p.company}</div>
          {score !== undefined && (
            <div className={`text-[9px] font-bold px-1 rounded border ${score >= 80 ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-gray-100 border-gray-300 text-gray-600'}`}>
              {score}%
            </div>
          )}
       </div>
     </div>
  </div>
);

type CustomObjectType = 'seat' | 'table_round' | 'table_rect' | 'stage' | 'plant';

interface ObjectProperties {
  width?: number;
  height?: number;
  rotation?: number;
  shape?: 'circle' | 'square' | 'rounded';
  color?: string;
}

interface CustomObject {
  id: string;
  type: CustomObjectType;
  x: number;
  y: number;
  participantIndex?: number;
  properties: ObjectProperties;
}

const TOOLBAR_ITEMS: { type: CustomObjectType; label: string; icon: any }[] = [
  { type: 'seat', label: 'Cadeira', icon: User },
  { type: 'table_round', label: 'Mesa Redonda', icon: Circle },
  { type: 'table_rect', label: 'Mesa Retangular', icon: Square },
  { type: 'stage', label: 'Palco', icon: Monitor },
  { type: 'plant', label: 'Decoração', icon: Flower },
];

const SeatingView: React.FC<SeatingViewProps> = ({ data, isDarkMode, readOnly = false, overrideLayout, onLayoutChange }) => {
  const [selectedLayout, setSelectedLayout] = useState<LayoutFormat>(() => {
    if (overrideLayout) return overrideLayout;
    const saved = localStorage.getItem('rampup_saved_layout');
    return (saved as LayoutFormat) || data.suggestedLayout;
  });

  useEffect(() => {
    if (overrideLayout && overrideLayout !== selectedLayout) {
      setSelectedLayout(overrideLayout);
    }
  }, [overrideLayout, selectedLayout]);

  useEffect(() => {
    onLayoutChange?.(selectedLayout);
  }, [selectedLayout, onLayoutChange]);

  const [zoomLevel, setZoomLevel] = useState(1);
  const [customObjects, setCustomObjects] = useState<CustomObject[]>([]);
  const [activeTool, setActiveTool] = useState<CustomObjectType | null>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [filterSegment, setFilterSegment] = useState<string>('');
  const [minScore, setMinScore] = useState<number>(0);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const getParticipant = (id: string) => data.participants.find(p => p.id === id);
  const getScore = (id: string) => data.individualScores.find(s => s.participantId === id)?.score || 0;

  const linearParticipants = useMemo(() => {
    return data.seatingGroups.flatMap(group => group.map(id => getParticipant(id))).filter(Boolean) as Participant[];
  }, [data]);

  const uniqueSegments = useMemo(() => {
    return Array.from(new Set(data.participants.map(p => p.segment))).sort();
  }, [data.participants]);

  const checkVisibility = (p: Participant) => {
    if (readOnly) return true;
    const score = getScore(p.id);
    const matchesSegment = filterSegment ? p.segment === filterSegment : true;
    const matchesScore = score >= minScore;
    return matchesSegment && matchesScore;
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.5));

  const handleSaveLayout = () => {
    localStorage.setItem('rampup_saved_layout', selectedLayout);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const handleDownloadImage = async () => {
    if (!mapRef.current) return;
    try {
      const canvas = await html2canvas(mapRef.current, {
        scale: 3,
        backgroundColor: isDarkMode ? '#1a202c' : '#ffffff',
        useCORS: true,
        logging: false,
        windowWidth: mapRef.current.scrollWidth,
        windowHeight: mapRef.current.scrollHeight
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `mapa_sala_${selectedLayout}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to save image", err);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (readOnly) return;
    if ((e.target as HTMLElement) === containerRef.current) setSelectedObjectId(null);
    if (selectedLayout !== 'custom' || !activeTool) return;
    if ((e.target as HTMLElement) !== containerRef.current) return;

    const rect = containerRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    let props: ObjectProperties = { rotation: 0 };
    if (activeTool === 'table_rect') props = { width: 100, height: 60, rotation: 0 };
    if (activeTool === 'table_round') props = { width: 80, height: 80, shape: 'circle' };
    if (activeTool === 'stage') props = { width: 200, height: 80 };
    if (activeTool === 'seat') props = { shape: 'circle' };

    let newObj: CustomObject = {
      id: Date.now().toString(),
      type: activeTool,
      x,
      y,
      properties: props
    };

    if (activeTool === 'seat') {
       const usedIndices = new Set(customObjects.filter(o => o.type === 'seat').map(o => o.participantIndex));
       let nextIdx = 0;
       while (usedIndices.has(nextIdx)) nextIdx++;
       if (nextIdx < linearParticipants.length) newObj.participantIndex = nextIdx;
       else return; 
    }

    setCustomObjects(prev => [...prev, newObj]);
    setActiveTool(null);
    setSelectedObjectId(newObj.id);
  };

  const handleObjectClick = (e: React.MouseEvent, id: string) => {
      if (readOnly) return;
      e.stopPropagation();
      setSelectedObjectId(id);
  };

  const handleObjectDragStart = (e: React.MouseEvent, id: string) => {
    if (readOnly) return;
    e.stopPropagation();
    setIsDragging(id);
    setSelectedObjectId(id);
  };

  const handleObjectDragMove = (e: React.MouseEvent) => {
    if (readOnly) return;
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    setCustomObjects(prev => prev.map(obj => obj.id === isDragging ? { ...obj, x, y } : obj));
  };

  const handleObjectDragEnd = () => {
    setIsDragging(null);
  };

  const clearCustomObjects = () => setCustomObjects([]);

  const deleteSelectedObject = () => {
      if (!selectedObjectId) return;
      setCustomObjects(prev => prev.filter(obj => obj.id !== selectedObjectId));
      setSelectedObjectId(null);
  };

  const getSelectedObject = () => customObjects.find(o => o.id === selectedObjectId);

  const renderVisualMap = () => {
    switch (selectedLayout) {
      case 'custom':
        return (
          <div className="flex flex-col h-full min-h-[600px] overflow-hidden relative">
             {!readOnly && (
             <div className="flex flex-wrap items-center gap-2 mb-4 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 z-30 relative">
                <span className="text-xs font-bold uppercase mr-2 opacity-50">Ferramentas:</span>
                {TOOLBAR_ITEMS.map(item => (
                  <button
                    key={item.type}
                    onClick={() => setActiveTool(item.type)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      activeTool === item.type 
                        ? 'bg-emerald-600 text-white shadow-md' 
                        : 'bg-white text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <item.icon className="w-3 h-3" />
                    {item.label}
                  </button>
                ))}
                <div className="flex-1"></div>
                <button onClick={clearCustomObjects} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-bold px-3 py-1.5 border border-red-200 rounded-md hover:bg-red-50 transition ml-auto">
                   <Eraser className="w-3 h-3" /> Limpar
                </button>
             </div>
             )}
             
             <div 
               ref={containerRef}
               onClick={handleCanvasClick}
               onMouseMove={handleObjectDragMove}
               onMouseUp={handleObjectDragEnd}
               onMouseLeave={handleObjectDragEnd}
               className={`flex-1 relative rounded-xl border-4 border-dashed overflow-hidden min-h-[500px] transition-colors ${
                 isDarkMode 
                   ? 'border-gray-700 bg-gray-950' 
                   : 'border-gray-300 bg-white'
               }`}
             >
                {!readOnly && getSelectedObject() && (
                  <div className={`absolute top-4 right-4 z-40 p-4 rounded-xl shadow-xl w-64 border animate-fade-in ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                      <div className="flex justify-between items-center mb-3">
                          <h5 className={`text-xs font-bold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Configurações</h5>
                          <button onClick={() => setSelectedObjectId(null)} className="text-gray-400 hover:text-gray-500"><Settings2 className="w-4 h-4" /></button>
                      </div>
                      <div className="space-y-3">
                          <button onClick={deleteSelectedObject} className="w-full mt-2 flex items-center justify-center gap-2 text-xs text-red-500 hover:text-red-600 font-bold py-2 border border-red-200 rounded-lg hover:bg-red-50 transition"><Trash2 className="w-3 h-3" /> Remover Objeto</button>
                      </div>
                  </div>
                )}

                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `linear-gradient(${isDarkMode ? '#555' : '#ccc'} 1px, transparent 1px), linear-gradient(90deg, ${isDarkMode ? '#555' : '#ccc'} 1px, transparent 1px)`, backgroundSize: '40px 40px' }}></div>

                {customObjects.map((obj) => {
                  const dynamicStyle: React.CSSProperties = {
                      left: `${obj.x}%`, 
                      top: `${obj.y}%`, 
                      transform: `translate(-50%, -50%) rotate(${obj.properties.rotation || 0}deg)`,
                      width: obj.properties.width ? `${obj.properties.width}px` : undefined,
                      height: obj.properties.height ? `${obj.properties.height}px` : undefined,
                  };
                  
                  if (obj.type === 'seat' && obj.participantIndex !== undefined) {
                    const p = linearParticipants[obj.participantIndex];
                    if (!p) return null;
                    const visible = checkVisibility(p);
                    const isSelected = selectedObjectId === obj.id;

                    return (
                      <div
                        key={obj.id}
                        onMouseDown={(e) => handleObjectDragStart(e, obj.id)}
                        onClick={(e) => handleObjectClick(e, obj.id)}
                        style={dynamicStyle}
                        className={`absolute cursor-move flex flex-col items-center group/custom z-20 ${isSelected ? 'ring-2 ring-emerald-400 rounded-full scale-110' : ''}`}
                      >
                         <div className={`w-8 h-8 flex items-center justify-center text-xs font-bold shadow-lg transition-all ${
                            p.isHost 
                              ? 'bg-amber-500 text-white border-2 border-white ring-2 ring-amber-300' 
                              : isDarkMode 
                                ? 'bg-verde-neon text-black border-2 border-white' 
                                : 'bg-emerald-600 text-white border-2 border-white'
                         } ${visible ? 'opacity-100' : 'opacity-20 grayscale'} ${obj.properties.shape === 'square' ? 'rounded-md' : 'rounded-full'}`}>
                            {p.isHost ? <Crown className="w-4 h-4" /> : obj.participantIndex + 1}
                         </div>
                         <div className={`mt-1 px-2 py-0.5 rounded text-[9px] font-bold whitespace-nowrap shadow-md pointer-events-none ${
                           p.isHost ? 'bg-amber-500 text-white' : isDarkMode ? 'bg-black text-white' : 'bg-gray-800 text-white'
                         }`}>
                           {p.name.split(' ')[0]}
                         </div>
                      </div>
                    );
                  } else {
                     let styleClass = "";
                     let content = null;
                     const isSelected = selectedObjectId === obj.id;
                     switch(obj.type) {
                        case 'table_round': styleClass = `rounded-full border-4 opacity-80 bg-gray-200 dark:bg-gray-700 border-gray-400 ${isSelected ? 'ring-2 ring-blue-500' : ''}`; break;
                        case 'table_rect': styleClass = `rounded border-4 opacity-80 bg-gray-200 dark:bg-gray-700 border-gray-400 ${isSelected ? 'ring-2 ring-blue-500' : ''}`; break;
                        case 'stage': styleClass = `rounded-t-xl border-x-4 border-t-4 opacity-90 bg-indigo-100 dark:bg-indigo-900 border-indigo-400 ${isSelected ? 'ring-2 ring-blue-500' : ''}`; content = <span className="text-[10px] uppercase font-black text-indigo-900 dark:text-indigo-200">Palco</span>; break;
                        case 'plant': styleClass = `text-green-600 dark:text-green-400 ${isSelected ? 'drop-shadow-lg scale-125' : ''}`; content = <Flower className="w-full h-full" />; break;
                     }
                     return (
                        <div key={obj.id} onMouseDown={(e) => handleObjectDragStart(e, obj.id)} onClick={(e) => handleObjectClick(e, obj.id)} style={dynamicStyle} className={`absolute cursor-move z-10 flex items-center justify-center ${styleClass}`}>{content}</div>
                     );
                  }
                })}
             </div>
          </div>
        );

      case 'buffet':
      case 'recepcao':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12 p-8">
            {data.seatingGroups.map((group, groupIdx) => (
              <div key={groupIdx} className={`relative p-8 rounded-full border-4 aspect-square flex flex-col items-center justify-center min-w-[320px] mx-auto shadow-xl ${
                isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-emerald-400'
              }`}>
                <div className={`absolute inset-4 rounded-full border-4 border-dashed opacity-30 ${isDarkMode ? 'border-gray-500' : 'border-emerald-600'}`}></div>
                <div className={`absolute -top-4 px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest shadow-lg ${
                  isDarkMode ? 'bg-gray-700 text-verde-neon' : 'bg-emerald-700 text-white'
                }`}>
                  Mesa {groupIdx + 1}
                </div>
                <div className="relative z-10 w-full space-y-2 text-center">
                  {group.map(id => {
                    const p = getParticipant(id);
                    if (!p) return null;
                    return (
                      <div key={id} className={`group/p relative transition-all ${p.isHost ? 'z-20 scale-105' : ''}`}>
                        <div className={`text-xs font-black truncate py-1.5 px-4 rounded-lg shadow-sm flex items-center justify-center gap-1.5 border-2 ${
                          p.isHost 
                          ? 'bg-amber-100 text-amber-900 border-amber-400'
                          : isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        }`}>
                          {p.isHost && <Crown className="w-3.5 h-3.5" />}
                          {p.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );

      case 'conferencia':
        return (
           <div className="flex justify-center p-12 w-full overflow-x-auto">
             <div className={`relative min-w-[800px] w-full max-w-5xl rounded-2xl border-8 flex flex-wrap content-center justify-center p-12 gap-6 shadow-2xl ${
               isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-emerald-800'
             }`}>
                <div className={`absolute -top-6 left-1/2 -translate-x-1/2 px-8 py-2 rounded-full text-lg font-black uppercase tracking-widest shadow-xl ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-emerald-800 text-white'}`}>Mesa Executiva</div>
                {linearParticipants.map((p, idx) => (
                  <div key={p.id} className="w-28">
                    <SeatCard p={p} idx={idx + 1} isDarkMode={isDarkMode} isDimmed={!checkVisibility(p)} score={getScore(p.id)} />
                  </div>
                ))}
             </div>
           </div>
        );

      case 'mesa_u':
        const uTotal = linearParticipants.length;
        const uSideCount = Math.floor(uTotal / 3);
        const uTopCount = uTotal - (uSideCount * 2);
        const leftSide = linearParticipants.slice(0, uSideCount);
        const topSide = linearParticipants.slice(uSideCount, uSideCount + uTopCount);
        const rightSide = linearParticipants.slice(uSideCount + uTopCount);
        return (
          <div className="flex justify-center p-12 w-full overflow-x-auto">
             <div className="flex gap-8 items-start min-w-[900px] w-full max-w-6xl">
                <div className="flex flex-col w-1/4 pt-24 gap-3">
                   {leftSide.map((p, i) => <SeatCard key={p.id} p={p} idx={i + 1} isDarkMode={isDarkMode} isDimmed={!checkVisibility(p)} score={getScore(p.id)} />)}
                </div>
                <div className="flex flex-col w-2/4">
                   <div className="flex flex-wrap justify-center gap-3 mb-12">
                      {topSide.map((p, i) => (
                        <div key={p.id} className="w-24">
                          <SeatCard p={p} idx={uSideCount + i + 1} isDarkMode={isDarkMode} isDimmed={!checkVisibility(p)} score={getScore(p.id)} />
                        </div>
                      ))}
                   </div>
                   <div className={`h-full min-h-[300px] border-l-8 border-b-8 border-r-8 rounded-b-3xl shadow-inner ${
                      isDarkMode ? 'border-gray-600 bg-gray-950/40' : 'border-emerald-800 bg-emerald-50'
                   }`}>
                     <div className="h-full flex items-center justify-center text-xl font-black opacity-20 uppercase tracking-widest">Circulação</div>
                   </div>
                </div>
                <div className="flex flex-col w-1/4 pt-24 gap-3">
                   {rightSide.map((p, i) => <SeatCard key={p.id} p={p} idx={uSideCount + uTopCount + i + 1} isDarkMode={isDarkMode} isDimmed={!checkVisibility(p)} score={getScore(p.id)} />)}
                </div>
             </div>
          </div>
        );

      case 'mesa_t':
        const tTotal = linearParticipants.length;
        const tTopCount = Math.max(6, Math.ceil(tTotal * 0.4)); 
        const tTop = linearParticipants.slice(0, tTopCount);
        const tLeg = linearParticipants.slice(tTopCount);
        return (
          <div className="flex flex-col items-center p-8 min-h-[700px] w-full overflow-x-auto">
             <div className={`flex flex-wrap justify-center gap-4 p-8 rounded-2xl border-4 mb-4 relative z-10 min-w-[700px] shadow-xl ${
                isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-emerald-800'
             }`}>
                {tTop.map((p, idx) => (
                   <div key={p.id} className="w-28">
                     <SeatCard p={p} idx={idx + 1} isDarkMode={isDarkMode} isDimmed={!checkVisibility(p)} score={getScore(p.id)} />
                   </div>
                ))}
                <div className="absolute -top-4 px-6 py-1 bg-amber-500 text-white font-black rounded-full shadow-lg">PAINEL ESTRATÉGICO</div>
             </div>
             <div className={`flex flex-col items-center gap-3 p-8 rounded-b-3xl border-x-4 border-b-4 -mt-8 pt-12 min-w-[400px] ${
                 isDarkMode ? 'bg-gray-800/20 border-gray-700' : 'bg-emerald-50/50 border-emerald-800'
             }`}>
                {tLeg.map((p, idx) => (
                  <div key={p.id} className="w-[320px]">
                     <SeatCard p={p} idx={tTopCount + idx + 1} isDarkMode={isDarkMode} isDimmed={!checkVisibility(p)} score={getScore(p.id)} />
                  </div>
                ))}
             </div>
          </div>
        );

      case 'mesa_o':
        const qTotal = linearParticipants.length;
        const sCount = Math.floor(qTotal / 4);
        const oTop = linearParticipants.slice(0, sCount);
        const oRight = linearParticipants.slice(sCount, sCount * 2);
        const oBottom = linearParticipants.slice(sCount * 2, sCount * 3);
        const oLeft = linearParticipants.slice(sCount * 3);
        return (
          <div className="flex justify-center p-12 w-full overflow-x-auto">
            <div className="flex flex-col items-center justify-center gap-6 min-w-[800px]">
                <div className="flex gap-4">{oTop.map((p, i) => <div key={p.id} className="w-28"><SeatCard p={p} idx={i + 1} isDarkMode={isDarkMode} isDimmed={!checkVisibility(p)} /></div>)}</div>
                <div className="flex justify-between w-full max-w-6xl gap-12">
                   <div className="flex flex-col gap-3">{oLeft.map((p, i) => <div key={p.id} className="w-48"><SeatCard p={p} idx={sCount * 3 + i + 1} isDarkMode={isDarkMode} isDimmed={!checkVisibility(p)} /></div>)}</div>
                   <div className={`flex-1 rounded-2xl border-8 shadow-inner opacity-20 flex items-center justify-center ${isDarkMode ? 'border-gray-600 bg-gray-900' : 'border-emerald-800 bg-white'}`}>
                      <span className="text-2xl font-black tracking-[1em] uppercase opacity-40 text-center">Foco Central</span>
                   </div>
                   <div className="flex flex-col gap-3">{oRight.map((p, i) => <div key={p.id} className="w-48"><SeatCard p={p} idx={sCount + i + 1} isDarkMode={isDarkMode} isDimmed={!checkVisibility(p)} /></div>)}</div>
                </div>
                <div className="flex gap-4">{oBottom.map((p, i) => <div key={p.id} className="w-28"><SeatCard p={p} idx={sCount * 2 + i + 1} isDarkMode={isDarkMode} isDimmed={!checkVisibility(p)} /></div>)}</div>
            </div>
          </div>
        );

      case 'sala_aula':
        const classroomCols = 4;
        const classroomRows = Math.ceil(linearParticipants.length / classroomCols);
        const rows = [];
        for (let i = 0; i < classroomRows; i++) rows.push(linearParticipants.slice(i * classroomCols, (i + 1) * classroomCols));
        return (
          <div className="flex flex-col items-center gap-12 py-12 min-h-[700px] w-full overflow-x-auto">
             <div className={`min-w-[500px] w-3/4 h-16 rounded-b-3xl border-b-8 border-x-8 mb-12 flex items-center justify-center shadow-2xl ${
                isDarkMode ? 'border-gray-600 bg-gray-800 text-gray-400' : 'border-emerald-900 bg-emerald-900 text-emerald-50'
             }`}>
               <Monitor className="w-6 h-6 mr-3" /><span className="text-xl font-black uppercase tracking-widest">Painel / Palestra</span>
             </div>
             <div className="flex flex-col gap-8 w-full max-w-5xl px-8 min-w-[800px]">
                {rows.map((row, rIdx) => (
                   <div key={rIdx} className="grid grid-cols-4 gap-6 w-full">
                      {row.map((p, cIdx) => (
                         <div key={p.id} className="w-full">
                            <SeatCard p={p} idx={rIdx * classroomCols + cIdx + 1} isDarkMode={isDarkMode} isDimmed={!checkVisibility(p)} score={getScore(p.id)} />
                            <div className={`h-3 w-[95%] mx-auto mt-2 rounded-full shadow-inner opacity-40 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-400'}`}></div>
                         </div>
                      ))}
                   </div>
                ))}
             </div>
          </div>
        );

      default:
        return (
          <div className="space-y-8 overflow-x-auto p-12 bg-white rounded-3xl">
             <div className="w-2/3 min-w-[400px] mx-auto h-16 rounded-t-[50px] flex items-center justify-center mb-12 border-t-8 border-x-8 border-emerald-900 bg-emerald-50 shadow-inner">
               <span className="text-xl font-black text-emerald-900 uppercase tracking-widest">Painel Principal</span>
             </div>
             <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-6 min-w-[700px]">
               {linearParticipants.map((p, idx) => (
                 <div key={p.id} className="w-full">
                    <SeatCard p={p} idx={idx + 1} isDarkMode={isDarkMode} isDimmed={!checkVisibility(p)} score={getScore(p.id)} />
                 </div>
               ))}
             </div>
          </div>
        );
    }
  };

  return (
    <div className={`space-y-8 animate-fade-in ${readOnly ? 'space-y-0' : ''}`}>
      {!readOnly && (
      <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-chumbo-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div>
            <h3 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <LayoutDashboard className="w-5 h-5" />
              Configuração da Sala
            </h3>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Formato sugerido: <span className="font-bold text-emerald-500">{LAYOUT_OPTIONS.find(l => l.id === data.suggestedLayout)?.label || 'Personalizado'}</span>
            </p>
          </div>
          <div className="w-full md:w-auto flex flex-col gap-3">
             <div className="flex items-center gap-2">
                <button onClick={handleSaveLayout} className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border shadow-sm transition-all ${isDarkMode ? 'bg-chumbo-800 border-gray-700 text-verde-light hover:bg-chumbo-900' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                   {showSavedToast ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                   {showSavedToast ? 'Salvo!' : 'Salvar Layout'}
                </button>
                <button onClick={handleDownloadImage} className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border shadow-sm transition-all ${isDarkMode ? 'bg-chumbo-800 border-gray-700 text-verde-light hover:bg-chumbo-900' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                   <ImageIcon className="w-3 h-3" /> Salvar Imagem (PNG)
                </button>
             </div>
          </div>
        </div>

        <div className={`mt-6 pt-6 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-3">
                <label className={`block text-xs font-bold uppercase mb-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Escolher Formato</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-2">
                  {LAYOUT_OPTIONS.map(option => (
                    <button key={option.id} onClick={() => setSelectedLayout(option.id)} title={option.description} className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${selectedLayout === option.id ? (isDarkMode ? 'bg-verde-neon text-black border-verde-neon' : 'bg-emerald-600 text-white border-emerald-600 shadow-md transform scale-105') : (isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}`}>
                      <option.icon className="w-4 h-4 mb-1" /><span className="text-[9px] font-bold text-center leading-none">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className={`block text-xs font-bold uppercase mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Filtrar por Segmento</label>
                    <select value={filterSegment} onChange={(e) => setFilterSegment(e.target.value)} className={`block w-full px-3 py-2 text-sm rounded-lg border outline-none ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                        <option value="">Todos os Segmentos</option>
                        {uniqueSegments.map(seg => <option key={seg} value={seg}>{seg}</option>)}
                    </select>
                  </div>
                  <div>
                     <label className={`block text-xs font-bold uppercase mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Score Mínimo (IN): {minScore}%</label>
                     <input type="range" min="0" max="100" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${isDarkMode ? 'bg-gray-700 accent-verde-neon' : 'bg-gray-200 accent-emerald-500'}`} />
                  </div>
              </div>
           </div>
        </div>
      </div>
      )}

      <div className={`rounded-2xl border min-h-[500px] overflow-hidden ${isDarkMode && !readOnly ? 'bg-chumbo-800 border-gray-800' : readOnly ? 'bg-white border-0' : 'bg-gray-100 border-gray-200 shadow-inner'}`}>
         {!readOnly && (
         <div className="flex justify-between items-center p-6 border-b dark:border-gray-800">
            <h4 className={`font-bold uppercase tracking-widest text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Visualização do Mapa Estratégico</h4>
            <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border dark:border-gray-700">
              <button onClick={handleZoomOut} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><ZoomOut className="w-4 h-4" /></button>
              <span className="text-xs font-mono w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={handleZoomIn} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><ZoomIn className="w-4 h-4" /></button>
            </div>
         </div>
         )}
         
         <div ref={mapRef} className={`w-full overflow-x-auto p-4 ${isDarkMode && !readOnly ? 'bg-chumbo-950' : 'bg-white'}`}>
            <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left', width: 'fit-content' }} className="transition-transform duration-200">
                {renderVisualMap()}
            </div>
         </div>
      </div>
    </div>
  );
};

export default SeatingView;