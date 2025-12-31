
import React, { useState, useEffect } from 'react';
import { WegMotorData, BlockData, ProjectData, PageData, ComparisonData, ProjectSummary } from './types';
import { WEG_MOTORS, getMotorByCv } from './motorData';
import { calculateDimensioning, calculateGeneralSummary } from './calculations';
import { GoogleGenAI } from "@google/genai";

const WegMotorIcon = ({ color = "#005792", size = "w-4 h-4" }: { color?: string, size?: string }) => (
  <svg viewBox="0 0 128 128" className={`${size} shrink-0`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="25" y="40" width="70" height="48" rx="4" fill={color} />
    <rect x="95" y="50" width="12" height="28" rx="2" fill="#334155" />
    <circle cx="25" cy="64" r="14" fill={color} stroke="white" strokeWidth="2"/>
    <circle cx="25" cy="64" r="4" fill="white" />
  </svg>
);

const App: React.FC = () => {
  const [project, setProject] = useState<ProjectData>(() => {
    const saved = localStorage.getItem('cf_precision_final_v1');
    return saved ? JSON.parse(saved) : {
      title: 'Projeto Campo Forte',
      pages: [{
        id: 'p1',
        blocks: [
          { id: 'b1', type: 'text', value: 'MEMORIAL DESCRITIVO TÉCNICO', fontSize: 14, bold: true, align: 'center' },
          { id: 'b2', type: 'text', value: 'DIMENSIONAMENTO E EFICIÊNCIA ENERGÉTICA', fontSize: 10, align: 'center' },
          { id: 'b3', type: 'text', value: '', fontSize: 11 }
        ]
      }]
    };
  });

  const [headerImage, setHeaderImage] = useState<string | null>(() => localStorage.getItem('cf_logo_v12'));
  const [isLocked, setIsLocked] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem('cf_precision_final_v1', JSON.stringify(project)); }, [project]);
  useEffect(() => { if (headerImage) localStorage.setItem('cf_logo_v12', headerImage); }, [headerImage]);

  const addBlock = (type: 'text' | 'comparison' | 'summary_table', targetPageId?: string) => {
    const newBlock: BlockData = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      value: type === 'comparison' ? { before: { cv: 1, cable: '2.5', breaker: 'DISJ 10A', starter: 'DIRETA' }, after: { cv: 1 } } : '',
      fontSize: 11,
      align: 'left'
    };
    
    // Se não houver ID de página alvo, adiciona na última página
    const pageId = targetPageId || project.pages[project.pages.length - 1].id;

    setProject(prev => ({
      ...prev,
      pages: prev.pages.map(p => p.id === pageId ? { ...p, blocks: [...p.blocks, newBlock] } : p)
    }));
    setActiveBlockId(newBlock.id);
  };

  const updateBlock = (blockId: string, updates: Partial<BlockData>) => {
    setProject(prev => ({
      ...prev,
      pages: prev.pages.map(p => ({
        ...p,
        blocks: p.blocks.map(b => b.id === blockId ? { ...b, ...updates } : b)
      }))
    }));
  };

  const removeBlock = (blockId: string) => {
    setProject(prev => ({
      ...prev,
      pages: prev.pages.map(p => ({
        ...p,
        blocks: p.blocks.filter(b => b.id !== blockId)
      }))
    }));
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    setProject(prev => {
      const newPages = prev.pages.map(page => {
        const index = page.blocks.findIndex(b => b.id === blockId);
        if (index === -1) return page;
        if (direction === 'up' && index === 0) return page;
        if (direction === 'down' && index === page.blocks.length - 1) return page;
        const newBlocks = [...page.blocks];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
        return { ...page, blocks: newBlocks };
      });
      return { ...prev, pages: newPages };
    });
  };

  const generateAI = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const motors = project.pages.flatMap(p => p.blocks)
        .filter(b => b.type === 'comparison')
        .map(b => getMotorByCv((b.value as ComparisonData).after.cv))
        .filter((m): m is WegMotorData => !!m);

      if (motors.length === 0) {
        alert("Adicione ao menos um motor para gerar o relatório.");
        setIsGenerating(false);
        return;
      }

      const summary = calculateGeneralSummary(motors);
      const prompt = `Como um consultor sênior da Campo Forte, escreva uma conclusão técnica curta (máximo 4 linhas) sobre este projeto. 
      Contempla ${summary.motorCount} motores WEG IE3 Premium, potência total ${summary.totalCv} CV. 
      Foque na redução de custos e conformidade normativa.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      const aiText = response.text || "Dimensionamento técnico concluído com sucesso.";
      const lastPageId = project.pages[project.pages.length - 1].id;
      
      setProject(prev => ({
        ...prev,
        pages: prev.pages.map(p => p.id === lastPageId ? { 
          ...p, 
          blocks: [
            ...p.blocks, 
            {
              id: Math.random().toString(36).substr(2, 9),
              type: 'text',
              value: `PARECER TÉCNICO CAMPO FORTE: ${aiText.trim()}`,
              fontSize: 10,
              italic: true,
              align: 'justify',
              bold: true
            },
            {
              id: Math.random().toString(36).substr(2, 9),
              type: 'summary_table',
              value: '',
              fontSize: 11,
              align: 'left'
            }
          ] 
        } : p)
      }));
    } catch (e) {
      console.error(e);
      addBlock('summary_table');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderSummaryTable = (summary: ProjectSummary) => (
    <div className="mt-6 border-2 border-slate-800 rounded-sm overflow-hidden bg-white">
      <div className="bg-[#001d3d] text-white p-3 font-black text-sm uppercase tracking-widest text-center border-b-2 border-slate-800">
        QUADRO DE ESPECIFICAÇÕES TÉCNICAS E DIMENSIONAMENTO - WEG IE3 PREMIUM
      </div>
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr className="bg-slate-200 border-b-2 border-slate-800 font-black uppercase text-slate-800">
            <th className="p-2 border-r border-slate-300 w-8 text-center">ITEM</th>
            <th className="p-2 border-r border-slate-300">MOTOR / FICHA TÉCNICA DETALHADA</th>
            <th className="p-2 border-r border-slate-300">DIMENSIONAMENTO ELÉTRICO</th>
            <th className="p-2">COMPONENTES WEG</th>
          </tr>
        </thead>
        <tbody>
          {summary.details.map((d, i) => (
            <tr key={i} className="border-b border-slate-300">
              <td className="p-2 border-r border-slate-300 text-center font-black bg-slate-50 text-slate-400">{i + 1}</td>
              <td className="p-2 border-r border-slate-300">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <WegMotorIcon color="#005792" size="w-10 h-10" />
                    <span className="text-[7px] font-black text-[#005792] mt-1 uppercase tracking-tighter">W22 IE3</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-black text-[12px] text-slate-900">{d.motor.cv} CV ({d.motor.kw} kW)</span>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{d.motor.model}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-y-1 text-[8px] font-semibold text-slate-600 border-t border-slate-100 pt-1">
                      <span>CARCAÇA: <b className="text-slate-900">{d.motor.frame}</b></span>
                      <span>IN: <b className="text-slate-900">{d.motor.currentIn}A</b></span>
                      <span>RPM: <b className="text-slate-900">{d.motor.rpm}</b></span>
                      <span>RENDIM: <b className="text-slate-900">{d.motor.efficiency}%</b></span>
                      <span>PESO: <b className="text-slate-900">{d.motor.weight}kg</b></span>
                      <span>FP: <b className="text-slate-900">{d.motor.powerFactor}</b></span>
                    </div>
                  </div>
                </div>
              </td>
              <td className="p-2 border-r border-slate-300 bg-blue-50/20">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center border-b border-blue-100 pb-0.5">
                    <span className="text-blue-800 font-bold uppercase text-[7px]">CONDUTOR (Cabo)</span>
                    <span className="text-[11px] font-black text-blue-900">{d.cableSize}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-blue-100 pb-0.5">
                    <span className="text-slate-600 font-bold uppercase text-[7px]">DISJUNTOR MOTOR</span>
                    <span className="text-[10px] font-black text-slate-800">{d.circuitBreaker}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-orange-700 font-bold uppercase text-[7px]">REGIME PARTIDA</span>
                    <span className="text-[9px] font-black text-orange-800 uppercase">{d.motor.cv >= 10 ? 'SOFT-STARTER' : 'DIRETA'}</span>
                  </div>
                </div>
              </td>
              <td className="p-2 text-slate-800 font-bold bg-slate-50/30">
                <div className="flex flex-col gap-1 text-[9px]">
                  <div className="flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-900"></div>
                    <span>CONTATOR: {d.contactor}</span>
                  </div>
                  <div className="flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-900"></div>
                    <span>{d.motor.cv >= 10 ? 'CHAVE: SSW07 / CFW11' : (d.motor.cv >= 1 ? 'INVERSOR: CFW500' : 'CHAVE MANUAL')}</span>
                  </div>
                  <div className="flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-900"></div>
                    <span>RELE TÉRMICO: RW27-D</span>
                  </div>
                </div>
              </td>
            </tr>
          ))}
          <tr className="bg-[#001d3d] text-white font-black text-[11px] uppercase tracking-tighter">
            <td colSpan={2} className="p-3 border-r border-slate-700">
              TOTALIZAÇÃO DO PROJETO: {summary.motorCount} UNIDADES | {summary.totalCv} CV TOTAL ({summary.totalKw} kW)
            </td>
            <td className="p-3 border-r border-slate-700 text-center">IN TOTAL: {summary.totalIn} A</td>
            <td className="p-3 text-right bg-blue-800">
              {summary.recommendedMainBreaker}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-200 flex flex-col items-center">
      
      {/* TOOLBAR */}
      <div className="fixed top-0 left-0 w-full h-10 bg-[#001d3d] shadow-2xl z-[9999] no-print flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="text-white font-black text-[11px] tracking-tight pr-3 border-r border-slate-700 uppercase">CAMPO FORTE</span>
          <button onClick={() => addBlock('text')} className="tool-btn">TEXTO</button>
          <button onClick={() => addBlock('comparison')} className="tool-btn">ADICIONAR MOTOR</button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={generateAI} disabled={isGenerating} className={`action-btn ${isGenerating ? 'bg-slate-700' : 'bg-blue-600'}`}>
            {isGenerating ? 'PROCESSANDO...' : 'QUADRO TÉCNICO'}
          </button>
          <button onClick={() => window.print()} className="action-btn bg-white text-black">SALVAR PDF</button>
          <button onClick={() => setIsLocked(!isLocked)} className={`action-btn ${isLocked ? 'bg-red-500' : 'bg-green-600'}`}>
            {isLocked ? 'DESTRAVAR' : 'TRAVAR'}
          </button>
        </div>
      </div>

      {/* DOCUMENTO */}
      <div className="mt-14 mb-20 w-full flex flex-col items-center gap-4">
        {project.pages.map((page, pIdx) => (
          <div key={page.id} className="bg-white w-full max-w-[210mm] min-h-[297mm] p-10 md:p-14 relative flex flex-col shadow-lg print:shadow-none print:p-8 overflow-hidden">
            
            {/* LOGO */}
            <div className="w-full flex justify-center mb-6 no-print-img">
              {headerImage ? (
                <img src={headerImage} className="max-h-12 cursor-pointer" onClick={() => !isLocked && document.getElementById('logo-up')?.click()} />
              ) : (
                !isLocked && <button onClick={() => document.getElementById('logo-up')?.click()} className="text-[9px] text-slate-300 border border-dashed p-4 uppercase font-black">CABEÇALHO LOGOTIPO</button>
              )}
              <input type="file" id="logo-up" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0];
                if(f){ const r = new FileReader(); r.onloadend = () => setHeaderImage(r.result as string); r.readAsDataURL(f); }
              }} />
            </div>

            {/* CONTEÚDO */}
            <div className="flex flex-col flex-1">
              {page.blocks.map((block) => (
                <div key={block.id} className={`relative group mb-0.5 ${activeBlockId === block.id && !isLocked ? 'bg-blue-50/10' : ''}`} onClick={() => !isLocked && setActiveBlockId(block.id)}>
                  
                  {!isLocked && activeBlockId === block.id && (
                    <div className="absolute -left-10 top-0 flex flex-col gap-1 no-print z-50">
                      <button onClick={() => moveBlock(block.id, 'up')} className="bg-white border border-slate-200 text-slate-500 rounded p-1 text-[8px] font-black">▲</button>
                      <button onClick={() => removeBlock(block.id)} className="bg-white border border-slate-200 text-red-400 rounded p-1 text-sm font-bold">×</button>
                      <button onClick={() => moveBlock(block.id, 'down')} className="bg-white border border-slate-200 text-slate-500 rounded p-1 text-[8px] font-black">▼</button>
                    </div>
                  )}

                  {block.type === 'text' ? (
                    <textarea
                      className="w-full bg-transparent border-none outline-none resize-none overflow-hidden text-slate-900 leading-tight p-0 m-0"
                      style={{ fontSize: `${block.fontSize}px`, fontWeight: block.bold ? 'bold' : 'normal', textAlign: block.align, fontStyle: block.italic ? 'italic' : 'normal' }}
                      value={block.value as string}
                      onChange={(e) => {
                        updateBlock(block.id, { value: e.target.value });
                        e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      onFocus={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                      disabled={isLocked}
                      placeholder="..."
                    />
                  ) : block.type === 'summary_table' ? (
                    renderSummaryTable(calculateGeneralSummary(
                      project.pages.flatMap(p => p.blocks)
                        .filter(b => b.type === 'comparison')
                        .map(b => getMotorByCv((b.value as ComparisonData).after.cv))
                        .filter((m): m is WegMotorData => !!m)
                    ))
                  ) : (
                    /* WIDGET SIMÉTRICO */
                    <div className="flex items-center w-full gap-2 h-7 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      {/* ANTES */}
                      <div className="flex-[1] flex items-center border-r border-slate-200 pr-1 py-0.5">
                        <WegMotorIcon color="#cbd5e1" size="w-4 h-4" />
                        <span className="text-[7px] font-black text-slate-400 ml-1 shrink-0 uppercase">ANT:</span>
                        <div className="flex items-center gap-1 ml-1 flex-1">
                          <select 
                            className="text-[10px] font-black text-slate-400 outline-none p-0 h-4 bg-transparent appearance-none"
                            value={(block.value as ComparisonData).before.cv}
                            onChange={(e) => updateBlock(block.id, { value: { ...(block.value as ComparisonData), before: { ...(block.value as ComparisonData).before, cv: parseFloat(e.target.value) } } })}
                            disabled={isLocked}
                          >
                            {WEG_MOTORS.map(m => <option key={m.cv} value={m.cv}>{m.cv}CV</option>)}
                          </select>
                          <span className="text-[7px] text-slate-300 font-bold shrink-0">{(getMotorByCv((block.value as ComparisonData).before.cv)?.kw || 0).toFixed(2)}kW</span>
                          <div className="flex items-center gap-0.5 ml-auto">
                            <input 
                              className="w-6 text-[10px] bg-transparent border-none outline-none text-slate-400 font-black text-right"
                              value={(block.value as ComparisonData).before.cable}
                              onChange={(e) => updateBlock(block.id, { value: { ...(block.value as ComparisonData), before: { ...(block.value as ComparisonData).before, cable: e.target.value } } })}
                              disabled={isLocked}
                            />
                            <span className="text-[6px] text-slate-200 font-black">mm²</span>
                          </div>
                          <input 
                            className="w-12 text-[8px] bg-transparent border-none outline-none text-slate-300 font-black uppercase truncate"
                            value={(block.value as ComparisonData).before.breaker}
                            onChange={(e) => updateBlock(block.id, { value: { ...(block.value as ComparisonData), before: { ...(block.value as ComparisonData).before, breaker: e.target.value } } })}
                            disabled={isLocked}
                            placeholder="PROT"
                          />
                        </div>
                      </div>

                      {/* DEPOIS */}
                      <div className="flex-[1.5] flex items-center pl-1 py-0.5">
                        <WegMotorIcon color="#005792" size="w-4 h-4" />
                        <span className="text-[7px] font-black text-[#005792] ml-1 shrink-0 uppercase">PROJ:</span>
                        <div className="flex items-center gap-2 ml-1 flex-1">
                          <select 
                            className="text-[11px] font-black text-[#005792] outline-none p-0 h-4 bg-transparent cursor-pointer"
                            value={(block.value as ComparisonData).after.cv}
                            onChange={(e) => updateBlock(block.id, { value: { ...(block.value as ComparisonData), after: { cv: parseFloat(e.target.value) } } })}
                            disabled={isLocked}
                          >
                            {WEG_MOTORS.map(m => <option key={m.cv} value={m.cv}>{m.cv} CV W22</option>)}
                          </select>
                          <span className="text-[8px] text-blue-300 font-black shrink-0">{(getMotorByCv((block.value as ComparisonData).after.cv)?.kw || 0).toFixed(2)}kW</span>
                          <div className="flex-1 flex justify-between ml-2 items-center">
                            <div className="flex items-center gap-0.5">
                              <span className="text-[10px] font-black text-blue-800">{calculateDimensioning(getMotorByCv((block.value as ComparisonData).after.cv)!).cableSize.replace('mm²', '')}</span>
                              <span className="text-[6px] text-blue-300 font-black uppercase">mm²</span>
                            </div>
                            <div className="text-[9px] font-black text-slate-700 uppercase truncate max-w-[60px]">
                              {calculateDimensioning(getMotorByCv((block.value as ComparisonData).after.cv)!).circuitBreaker.split('-')[0]}
                            </div>
                            <div className="text-right text-[7px] font-black text-orange-600 uppercase">
                              {(block.value as ComparisonData).after.cv >= 10 ? 'SOFT' : 'DIR'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-2 flex justify-between opacity-30 text-[7px] font-black uppercase tracking-widest text-slate-400">
              <span>CAMPO FORTE ENGENHARIA ELÉTRICA</span>
              <span>Página {pIdx + 1} de {project.pages.length}</span>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .tool-btn { color: #94a3b8; padding: 4px 12px; border-radius: 4px; font-weight: 800; font-size: 10px; border: 1px solid #1e293b; text-transform: uppercase; transition: 0.1s; }
        .tool-btn:hover { color: white; background: #1e293b; }
        .action-btn { padding: 4px 14px; border-radius: 4px; font-weight: 900; font-size: 10px; text-transform: uppercase; transition: 0.1s; }
        @media print {
          .no-print, .no-print-img { display: none !important; }
          body { background: white !important; margin: 0 !important; }
          .max-w-[210mm] { width: 100% !important; max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
          textarea { height: auto !important; overflow: visible !important; }
          .bg-slate-200 { background: white !important; }
          .shadow-lg { box-shadow: none !important; }
        }
        textarea { border: none !important; box-shadow: none !important; outline: none !important; }
        select { -webkit-appearance: none; -moz-appearance: none; appearance: none; }
      `}</style>
    </div>
  );
};

export default App;
