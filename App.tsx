
import React, { useState, useEffect, useRef } from 'react';
import { WegMotorData, DimensioningResult } from './types';
import { WEG_MOTORS, getMotorByCv } from './motorData';
import { calculateDimensioning, calculateGeneralSummary } from './calculations';
import { GoogleGenAI } from "@google/genai";

interface PageData {
  id: string;
  type: 'report' | 'materials' | 'summary';
  title: string;
  content: any[];
  text: string;
}

const MotorIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4M6 6l-2-2M18 6l2-2M6 18l-2 2M18 18l2 2" />
  </svg>
);

const AIIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const App: React.FC = () => {
  const [pages, setPages] = useState<PageData[]>([
    { id: 'p1', type: 'report', title: 'LAUDO TÉCNICO', content: [{ id: 't1', type: 'text', value: '' }], text: '' }
  ]);
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [headerOffset, setHeaderOffset] = useState(15);
  const [isLocked, setIsLocked] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  
  const reportRef = useRef<HTMLDivElement>(null);
  const currentDate = new Date().toLocaleDateString('pt-BR');

  useEffect(() => {
    const saved = localStorage.getItem('campo-forte-v7');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.pages) setPages(parsed.pages);
      if (parsed.headerImage) setHeaderImage(parsed.headerImage);
      if (parsed.headerOffset) setHeaderOffset(parsed.headerOffset);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('campo-forte-v7', JSON.stringify({ pages, headerImage, headerOffset }));
  }, [pages, headerImage, headerOffset]);

  const callAI = async (promptType: 'audit' | 'text' | 'chat') => {
    setAiLoading(true);
    setAiPanelOpen(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = 'gemini-3-flash-preview';
      const allMotors = pages.flatMap(p => p.content).filter(i => i.type === 'motor').map(i => getMotorByCv(parseFloat(i.value)));
      const projectSummary = calculateGeneralSummary(allMotors.filter((m): m is WegMotorData => !!m));
      let systemInstruction = `Você é o CAMPO FORTE AI, engenheiro eletricista sênior. Especialista em NBR 5410 e Motores WEG. Responda tecnicamente. Dados atuais: ${JSON.stringify(projectSummary)}.`;
      let finalPrompt = aiPrompt;
      if (promptType === 'audit') finalPrompt = "Realize auditoria técnica completa deste projeto baseada na NBR 5410.";
      else if (promptType === 'text') finalPrompt = "Escreva uma introdução técnica para este laudo de motores.";
      const response = await ai.models.generateContent({ model, contents: finalPrompt, config: { systemInstruction } });
      setAiResponse(response.text || 'Sem resposta.');
    } catch (error) {
      setAiResponse("Erro na IA.");
    } finally {
      setAiLoading(false);
    }
  };

  const addPage = (type: 'report' | 'materials' | 'summary') => {
    const titles = { report: 'ANEXO TÉCNICO', materials: 'LISTA DE MATERIAIS', summary: 'RESUMO DE DIMENSIONAMENTO' };
    setPages([...pages, {
      id: Math.random().toString(36).substr(2, 9),
      type,
      title: titles[type],
      content: type === 'report' ? [{ id: Math.random().toString(36).substr(2, 9), type: 'text', value: '' }] : [],
      text: ''
    }]);
  };

  const removePage = (id: string) => {
    if (pages.length <= 1) return;
    setPages(pages.filter(p => p.id !== id));
  };

  const addItem = (pageId: string, type: 'text' | 'motor') => {
    setPages(pages.map(p => p.id === pageId ? { ...p, content: [...p.content, { id: Math.random().toString(36).substr(2, 9), type, value: type === 'motor' ? '1' : '' }] } : p));
  };

  const updateItem = (pageId: string, itemId: string, value: string) => {
    setPages(pages.map(p => p.id === pageId ? { ...p, content: p.content.map(i => i.id === itemId ? { ...i, value } : i) } : p));
  };

  const deleteItem = (pageId: string, itemId: string) => {
    setPages(pages.map(p => p.id === pageId ? { ...p, content: p.content.filter(i => i.id !== itemId) } : p));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setHeaderImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const downloadFullProject = async () => {
    const { jsPDF } = (window as any).jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    for (let i = 0; i < pages.length; i++) {
      const el = document.getElementById(`page-${pages[i].id}`);
      if (el) {
        const canvas = await (window as any).html2canvas(el, { scale: 3, useCORS: true });
        if (i > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
      }
    }
    pdf.save('CAMPO_FORTE_DOCUMENTO.pdf');
  };

  return (
    <div className="min-h-screen bg-[#f3f2f1] font-sans flex flex-col items-center">
      
      {/* WORD STYLE RIBBON (TOP BAR) */}
      <nav className="w-full sticky top-0 z-[100] bg-[#2b579a] text-white px-8 py-2 no-print flex items-center justify-between shadow-md">
        <div className="flex items-center gap-8">
          <div className="text-lg font-bold tracking-tight">CAMPO FORTE</div>
          <div className="h-6 w-px bg-blue-400"></div>
          <div className="flex gap-1">
            <button onClick={() => addPage('report')} className="hover:bg-blue-600 px-3 py-1 rounded text-[11px] font-medium transition">Inserir Página</button>
            <button onClick={() => addPage('materials')} className="hover:bg-blue-600 px-3 py-1 rounded text-[11px] font-medium transition">Lista Materiais</button>
            <button onClick={() => addPage('summary')} className="hover:bg-blue-600 px-3 py-1 rounded text-[11px] font-medium transition">Resumo Técnico</button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button onClick={() => setAiPanelOpen(!aiPanelOpen)} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-[11px] font-bold transition">
            <AIIcon /> Campo Forte AI
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase opacity-70">Margem Topo</span>
            <input type="range" min="5" max="60" value={headerOffset} onChange={(e) => setHeaderOffset(parseInt(e.target.value))} className="w-20 accent-white" />
          </div>
          <button onClick={() => setIsLocked(!isLocked)} className={`px-4 py-1 rounded text-[11px] font-bold transition ${isLocked ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}>
            {isLocked ? 'VISUALIZAÇÃO' : 'MODO EDIÇÃO'}
          </button>
          <button onClick={downloadFullProject} className="bg-white text-[#2b579a] px-5 py-1 rounded text-[11px] font-bold hover:bg-blue-50 transition shadow-sm">SALVAR PDF</button>
        </div>
      </nav>

      {/* PAINEL LATERAL IA (STAY AS IS BUT CLEANER) */}
      <div className={`fixed right-0 top-[44px] h-[calc(100%-44px)] w-[380px] bg-slate-900 shadow-2xl z-[200] transition-transform duration-300 transform no-print ${aiPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col text-white">
          <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase tracking-widest text-sm text-blue-400">Inteligência Artificial</span>
            </div>
            <button onClick={() => setAiPanelOpen(false)} className="text-slate-400 hover:text-white text-xl">×</button>
          </div>
          <div className="flex-1 overflow-y-auto mb-4 bg-black/20 p-4 rounded text-xs leading-relaxed font-mono">
            {aiResponse || "Aguardando comando..."}
            {aiLoading && <div className="mt-2 text-blue-400 animate-pulse underline">Engenheiro IA analisando projeto...</div>}
          </div>
          <div className="space-y-2">
            <button onClick={() => callAI('audit')} className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded text-[10px] font-bold uppercase tracking-wider">Auditoria NBR 5410</button>
            <div className="flex gap-2">
              <input type="text" placeholder="Pergunte à IA..." className="flex-1 bg-slate-800 border-none rounded p-2 text-xs focus:ring-1 focus:ring-blue-500" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && callAI('chat')} />
              <button onClick={() => callAI('chat')} className="bg-white text-black px-3 rounded">→</button>
            </div>
          </div>
        </div>
      </div>

      {/* DOCUMENT VIEWPORT */}
      <div className="w-full flex-1 overflow-y-auto py-10 flex flex-col items-center">
        <div ref={reportRef} className="flex flex-col gap-10">
          {pages.map((page, pIdx) => (
            <div key={page.id} className="relative group">
              
              {/* EXTERNAL BUTTONS (WORD-LIKE FLOATING) */}
              {!isLocked && (
                <div className="absolute -left-20 top-0 flex flex-col gap-2 no-print">
                  <button onClick={() => addItem(page.id, 'text')} className="w-10 h-10 bg-white shadow-md border border-slate-200 rounded-full flex items-center justify-center hover:bg-blue-50 transition" title="Add Texto">T</button>
                  <button onClick={() => addItem(page.id, 'motor')} className="w-10 h-10 bg-white shadow-md border border-slate-200 rounded-full flex items-center justify-center hover:bg-blue-50 transition" title="Add Motor">M</button>
                  <button onClick={() => removePage(page.id)} className="w-10 h-10 bg-red-50 shadow-md border border-red-200 rounded-full flex items-center justify-center hover:bg-red-100 transition mt-4" title="Remover Folha">×</button>
                </div>
              )}

              {/* THE WHITE PAPER A4 PAGE */}
              <div 
                id={`page-${page.id}`} 
                className="bg-white w-[210mm] min-h-[297mm] shadow-[0_0_15px_rgba(0,0,0,0.15)] relative flex flex-col overflow-hidden text-left border border-slate-200"
                style={{ padding: `25mm` }}
              >
                {/* Header (Word Header Style) */}
                <div className="flex flex-col items-start w-full" style={{ marginTop: `${headerOffset}mm` }}>
                  <div className="w-full flex justify-between items-end mb-6">
                    <div className="h-[20mm] w-[50mm] flex items-center overflow-hidden">
                      {headerImage ? (
                        <img src={headerImage} alt="Logo" className="max-h-full max-w-full object-contain cursor-pointer" onClick={() => !isLocked && document.getElementById(`logo-${page.id}`)?.click()} />
                      ) : (
                        <div className="w-full h-full border border-dashed border-slate-300 flex items-center justify-center text-[9px] text-slate-300 font-bold cursor-pointer no-print" onClick={() => document.getElementById(`logo-${page.id}`)?.click()}>CLIQUE PARA LOGO</div>
                      )}
                      <input id={`logo-${page.id}`} type="file" className="hidden" onChange={handleLogoUpload} />
                    </div>
                    <div className="text-right border-b border-slate-100 pb-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tighter">Documento Gerado em {currentDate}</span>
                    </div>
                  </div>
                  <textarea 
                    className="w-full text-left text-3xl font-bold uppercase bg-transparent border-none focus:outline-none placeholder-slate-200 resize-none overflow-hidden leading-tight text-slate-800" 
                    rows={1} value={page.title} 
                    onChange={(e) => setPages(pages.map(p => p.id === page.id ? { ...p, title: e.target.value } : p))}
                    onInput={(e) => { (e.target as any).style.height = 'auto'; (e.target as any).style.height = (e.target as any).scrollHeight + 'px'; }}
                    disabled={isLocked}
                  />
                  <div className="w-16 h-1 bg-slate-800 mt-2"></div>
                </div>

                {/* Body Content */}
                <div className="mt-12 flex flex-col gap-6 flex-1 text-slate-700">
                  {page.type === 'report' && page.content.map(item => (
                    <div key={item.id} className="relative group/item w-full">
                      {!isLocked && <button onClick={() => deleteItem(page.id, item.id)} className="absolute -left-8 top-1 opacity-0 group-hover/item:opacity-100 text-red-300 text-xl no-print">×</button>}
                      {item.type === 'text' ? (
                        <textarea 
                          className="w-full text-[12pt] leading-[1.6] text-justify bg-transparent border-none focus:outline-none placeholder-slate-100 resize-none overflow-hidden" 
                          placeholder="Digite seu texto profissional aqui..." value={item.value} 
                          onChange={(e) => updateItem(page.id, item.id, e.target.value)}
                          onInput={(e) => { (e.target as any).style.height = 'auto'; (e.target as any).style.height = (e.target as any).scrollHeight + 'px'; }}
                          disabled={isLocked}
                        />
                      ) : (
                        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-sm border-l-4 border-[#2b579a] my-2 print:bg-transparent print:p-0 print:border-none">
                          <MotorIcon />
                          <div className="flex items-center gap-8">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Equipamento</span>
                              <select 
                                className="text-sm font-bold bg-transparent border-none p-0 focus:outline-none cursor-pointer text-slate-800"
                                value={item.value} onChange={(e) => updateItem(page.id, item.id, e.target.value)} disabled={isLocked}
                              >
                                {WEG_MOTORS.map(m => <option key={m.cv} value={m.cv}>{m.cv} CV - Trifásico 380V</option>)}
                              </select>
                            </div>
                            {(() => {
                              const motor = getMotorByCv(parseFloat(item.value));
                              if (!motor) return null;
                              const dim = calculateDimensioning(motor);
                              return (
                                <div className="flex items-center gap-6 text-[11px] font-medium border-l border-slate-200 pl-6">
                                  <div className="flex flex-col"><span className="text-[8px] text-slate-300 uppercase">Disjuntor</span><span className="text-slate-600 font-bold">{dim.circuitBreaker.split('(')[0]}</span></div>
                                  <div className="flex flex-col"><span className="text-[8px] text-slate-300 uppercase">Cabo</span><span className="text-blue-700 font-bold">{dim.cableSize}</span></div>
                                  <div className="flex flex-col"><span className="text-[8px] text-slate-300 uppercase">Contator</span><span className="text-slate-600">{dim.contactor.split('(')[0]}</span></div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {page.type === 'materials' && (
                    <textarea 
                      className="w-full flex-1 text-[13pt] leading-[2] bg-transparent border-none focus:outline-none placeholder-slate-100 resize-none font-medium" 
                      placeholder="Relacione os materiais da instalação aqui..." value={page.text}
                      onChange={(e) => setPages(pages.map(p => p.id === page.id ? { ...p, text: e.target.value } : p))}
                      disabled={isLocked}
                    />
                  )}

                  {page.type === 'summary' && (
                    <div className="flex flex-col gap-8">
                      {(() => {
                        const allMotors = pages.flatMap(p => p.content).filter(i => i.type === 'motor').map(i => getMotorByCv(parseFloat(i.value))).filter((m): m is WegMotorData => !!m);
                        const summary = calculateGeneralSummary(allMotors);
                        return (
                          <>
                            <div className="border border-slate-800">
                              <table className="w-full text-[10px] border-collapse">
                                <thead className="bg-slate-800 text-white uppercase tracking-wider">
                                  <tr>
                                    <th className="p-3 border border-slate-600 text-left">Motor</th>
                                    <th className="p-3 border border-slate-600">In (A)</th>
                                    <th className="p-3 border border-slate-600">Ip (A)</th>
                                    <th className="p-3 border border-slate-600">Disj. Motor</th>
                                    <th className="p-3 border border-slate-600 text-blue-200">Cabo (mm²)</th>
                                    <th className="p-3 border border-slate-600">Partida</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {allMotors.map((m, idx) => {
                                    const dim = calculateDimensioning(m);
                                    const ip = (m.currentIn * (m.cv >= 5 ? 3.5 : 7.5)).toFixed(1);
                                    return (
                                      <tr key={idx} className="border-b border-slate-100 text-center font-bold text-slate-800">
                                        <td className="p-3 text-left">{m.cv} CV</td>
                                        <td className="p-3">{m.currentIn}A</td>
                                        <td className="p-3 text-red-600">{ip}A</td>
                                        <td className="p-3">{dim.circuitBreaker.split('(')[0]}</td>
                                        <td className="p-3 text-blue-800">{dim.cableSize}</td>
                                        <td className="p-3">{dim.softStarter || "DIRETA"}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            <div className="grid grid-cols-2 gap-8 border-t-2 border-slate-900 pt-6">
                              <div className="space-y-2">
                                <h4 className="text-[11px] font-black uppercase text-slate-400">Dados da Instalação</h4>
                                <div className="flex justify-between text-sm"><span>Capacidade Total:</span><span className="font-bold">{summary.totalCv} CV ({summary.totalKw} kW)</span></div>
                                <div className="flex justify-between text-sm"><span>Carga Nominal (In):</span><span className="font-bold">{summary.totalIn} A</span></div>
                                <div className="flex justify-between text-sm text-red-600 italic"><span>Demanda de Partida:</span><span className="font-bold">{summary.totalIp.toFixed(1)} A</span></div>
                              </div>
                              <div className="bg-slate-800 text-white p-4 flex flex-col items-center justify-center rounded">
                                <span className="text-[9px] uppercase font-bold opacity-60 mb-2">Proteção Geral Recomendada</span>
                                <span className="text-3xl font-black">{summary.recommendedMainBreaker}</span>
                              </div>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-200 text-[10px] leading-relaxed italic text-slate-500">
                              Nota: Dimensionamento realizado conforme NBR 5410:2004. Tensão de linha: 380V Trifásico. 
                              Condutores instalados em eletrodutos aparentes conforme método B1.
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Footer (Word Footer Style) */}
                <footer className="mt-auto pt-6 border-t border-slate-100 flex justify-between text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                  <div>Documento Técnico Profissional | Campo Forte</div>
                  <div className="text-slate-400">Pág. {pIdx + 1} de {pages.length}</div>
                </footer>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        textarea::placeholder { color: #f1f5f9; }
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .shadow-[0_0_15px_rgba(0,0,0,0.15)] { box-shadow: none !important; }
          .border { border: none !important; }
          .py-10 { padding: 0 !important; }
          .bg-[#f3f2f1] { background: white !important; }
          #root { width: 100% !important; }
          .w-[210mm] { width: 100% !important; border: none !important; }
        }
        /* Ocultar barra de rolagem mas manter funcionalidade */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #f3f2f1; }
        ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #bbb; }
      `}</style>
    </div>
  );
};

export default App;
