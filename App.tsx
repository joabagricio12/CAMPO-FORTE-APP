
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
    const saved = localStorage.getItem('cf_precision_v12');
    return saved ? JSON.parse(saved) : {
      title: 'Projeto Campo Forte',
      pages: [{
        id: 'p1',
        blocks: [
          { id: 'b1', type: 'text', value: 'MEMORIAL DESCRITIVO TÉCNICO', fontSize: 14, bold: true, align: 'center' },
          { id: 'b2', type: 'text', value: 'ESTUDO DE EFICIÊNCIA ENERGÉTICA E DIMENSIONAMENTO', fontSize: 10, align: 'center' },
          { id: 'b3', type: 'text', value: '', fontSize: 11 }
        ]
      }]
    };
  });

  const [headerImage, setHeaderImage] = useState<string | null>(() => localStorage.getItem('cf_logo_v12'));
  const [isLocked, setIsLocked] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem('cf_precision_v12', JSON.stringify(project)); }, [project]);
  useEffect(() => { if (headerImage) localStorage.setItem('cf_logo_v12', headerImage); }, [headerImage]);

  const addBlock = (type: 'text' | 'comparison' | 'summary_table') => {
    const lastPage = project.pages[project.pages.length - 1];
    const newBlock: BlockData = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      value: type === 'comparison' ? { 
        before: { cv: 1, cable: '2,5', breaker: 'DISJ 10A', starter: 'DIRETA' }, 
        after: { cv: 1 } 
      } : '',
      fontSize: 11,
      align: 'left'
    };
    
    setProject(prev => ({
      ...prev,
      pages: prev.pages.map(p => p.id === lastPage.id ? { ...p, blocks: [...p.blocks, newBlock] } : p)
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
        alert("Adicione motores antes de gerar o quadro.");
        setIsGenerating(false);
        return;
      }

      addBlock('summary_table');
    } catch (e) {
      addBlock('summary_table');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderSummaryTable = (summary: ProjectSummary) => (
    <div className="mt-8 border-2 border-slate-900 rounded-sm overflow-hidden bg-white">
      <div className="bg-[#001d3d] text-white p-3 font-black text-sm uppercase text-center border-b-2 border-slate-900">
        QUADRO GERAL DE CARGAS E DIMENSIONAMENTO - PADRÃO WEG PREMIUM
      </div>
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr className="bg-slate-100 border-b-2 border-slate-900 font-black uppercase text-slate-800">
            <th className="p-2 border-r border-slate-300 w-10 text-center">ITEM</th>
            <th className="p-2 border-r border-slate-300">MOTOR / ESPECIFICAÇÕES</th>
            <th className="p-2 border-r border-slate-300">DIMENSIONAMENTO ELÉTRICO</th>
            <th className="p-2">PRODUTOS WEG</th>
          </tr>
        </thead>
        <tbody>
          {summary.details.map((d, i) => (
            <tr key={i} className="border-b border-slate-300">
              <td className="p-2 border-r border-slate-300 text-center font-black bg-slate-50 text-slate-500">{i + 1}</td>
              <td className="p-2 border-r border-slate-300">
                <div className="flex gap-3">
                  <WegMotorIcon color="#005792" size="w-10 h-10" />
                  <div>
                    <div className="font-black text-[12px] text-slate-900">{d.motor.cv} CV ({d.motor.kw} kW)</div>
                    <div className="text-[8px] font-bold text-slate-500 uppercase">W22 IE3 - Carcaça {d.motor.frame}</div>
                  </div>
                </div>
              </td>
              <td className="p-2 border-r border-slate-300 bg-blue-50/20">
                <div className="flex flex-col gap-1">
                  <span className="flex justify-between"><b>CONDUTOR:</b> <span>{d.cableSize}</span></span>
                  <span className="flex justify-between"><b>DISJUNTOR:</b> <span>{d.circuitBreaker}</span></span>
                </div>
              </td>
              <td className="p-2 text-[9px] font-bold text-slate-700">
                <div className="flex flex-col">
                  <span>CONTATOR: {d.contactor}</span>
                  <span>{d.motor.cv >= 10 ? 'PARTIDA: SSW07' : 'PARTIDA: DIRETA / CFW500'}</span>
                </div>
              </td>
            </tr>
          ))}
          <tr className="bg-[#001d3d] text-white font-black text-[11px] uppercase">
            <td colSpan={2} className="p-3 border-r border-slate-800">TOTAL: {summary.motorCount} MOTORES | {summary.totalCv} CV</td>
            <td className="p-3 border-r border-slate-800 text-center">CORRENTE: {summary.totalIn}A</td>
            <td className="p-3 text-right bg-blue-800">{summary.recommendedMainBreaker}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center">
      
      {/* TOOLBAR SUPERIOR */}
      <div className="fixed top-0 left-0 w-full h-12 bg-[#001d3d] shadow-2xl z-[9999] no-print flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <span className="text-white font-black text-sm tracking-widest border-r border-slate-700 pr-4">CAMPO FORTE</span>
          <button onClick={() => addBlock('text')} className="tool-btn">TEXTO</button>
          <button onClick={() => addBlock('comparison')} className="tool-btn">MOTOR</button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={generateAI} disabled={isGenerating} className={`action-btn ${isGenerating ? 'bg-slate-700' : 'bg-blue-600'} text-white`}>
            {isGenerating ? 'GERANDO...' : 'RELATÓRIO'}
          </button>
          <button onClick={() => window.print()} className="action-btn bg-white text-black border border-slate-300 font-black">BAIXAR PDF</button>
          <button onClick={() => setIsLocked(!isLocked)} className={`action-btn ${isLocked ? 'bg-red-500' : 'bg-green-600'} text-white`}>
            {isLocked ? 'DESTRAVAR' : 'TRAVAR'}
          </button>
        </div>
      </div>

      {/* ÁREA DE TRABALHO (A4) */}
      <div className="mt-16 mb-20 w-full flex flex-col items-center gap-6">
        {project.pages.map((page, pIdx) => (
          <div key={page.id} className="bg-white w-full max-w-[210mm] min-h-[297mm] p-12 md:p-16 relative flex flex-col shadow-2xl print:shadow-none print:p-8 overflow-hidden border border-slate-200">
            
            {/* LOGOTIPO */}
            <div className="w-full flex justify-center mb-10 no-print-img">
              {headerImage ? (
                <img src={headerImage} className="max-h-16 cursor-pointer" onClick={() => !isLocked && document.getElementById('logo-up')?.click()} />
              ) : (
                !isLocked && <button onClick={() => document.getElementById('logo-up')?.click()} className="text-[10px] text-slate-300 border-2 border-dashed p-8 uppercase font-black tracking-widest">ADICIONAR LOGOTIPO CAMPO FORTE</button>
              )}
              <input type="file" id="logo-up" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0];
                if(f){ const r = new FileReader(); r.onloadend = () => setHeaderImage(r.result as string); r.readAsDataURL(f); }
              }} />
            </div>

            {/* CONTEÚDO DO MEMORIAL */}
            <div className="flex flex-col flex-1">
              {page.blocks.map((block) => (
                <div key={block.id} className={`relative group mb-8 ${activeBlockId === block.id && !isLocked ? 'bg-blue-50/20 ring-1 ring-blue-100' : ''} p-2 transition-all`} onClick={() => !isLocked && setActiveBlockId(block.id)}>
                  
                  {/* BOTÕES DE CONTROLE */}
                  {!isLocked && activeBlockId === block.id && (
                    <div className="absolute -left-12 top-0 flex flex-col gap-1 no-print">
                      <button onClick={() => moveBlock(block.id, 'up')} className="bg-white border border-slate-200 text-slate-400 rounded p-1 text-[10px] hover:text-blue-600">▲</button>
                      <button onClick={() => moveBlock(block.id, 'down')} className="bg-white border border-slate-200 text-slate-400 rounded p-1 text-[10px] hover:text-blue-600">▼</button>
                      <button onClick={() => setProject(prev => ({...prev, pages: prev.pages.map(p => ({...p, blocks: p.blocks.filter(b => b.id !== block.id)}))}))} className="bg-white border border-slate-200 text-red-400 rounded p-1 text-lg hover:bg-red-50">×</button>
                    </div>
                  )}

                  {block.type === 'text' ? (
                    <textarea
                      className="w-full bg-transparent border-none outline-none resize-none overflow-hidden text-slate-800 leading-relaxed p-0"
                      style={{ fontSize: `${block.fontSize}px`, fontWeight: block.bold ? 'bold' : 'normal', textAlign: block.align, fontStyle: block.italic ? 'italic' : 'normal' }}
                      value={block.value as string}
                      onChange={(e) => {
                        updateBlock(block.id, { value: e.target.value });
                        e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      onFocus={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                      disabled={isLocked}
                      placeholder="Descreva aqui os detalhes técnicos..."
                    />
                  ) : block.type === 'summary_table' ? (
                    renderSummaryTable(calculateGeneralSummary(
                      project.pages.flatMap(p => p.blocks)
                        .filter(b => b.type === 'comparison')
                        .map(b => getMotorByCv((b.value as ComparisonData).after.cv))
                        .filter((m): m is WegMotorData => !!m)
                    ))
                  ) : (
                    /* WIDGET MOTOR - SIMETRIA TOTAL E ALINHAMENTO VERTICAL PERFEITO */
                    <div className="w-full flex flex-col border border-slate-800 rounded-sm bg-white overflow-hidden shadow-sm">
                      {/* TÍTULOS SUPERIORES */}
                      <div className="flex w-full bg-slate-900 border-b border-slate-800">
                        <div className="flex-1 p-2 text-[10px] font-black text-slate-300 uppercase text-center border-r border-slate-700 tracking-widest">SITUAÇÃO ATUAL</div>
                        <div className="flex-1 p-2 text-[10px] font-black text-blue-400 uppercase text-center tracking-widest">SITUAÇÃO PROJETADA</div>
                      </div>

                      <div className="flex w-full">
                        {/* COLUNA ESQUERDA (ATUAL) */}
                        <div className="flex-1 p-6 border-r border-slate-200 flex flex-col items-center gap-6 bg-slate-50/50">
                          {/* ÍCONE E LEGENDA */}
                          <div className="flex flex-col items-center gap-2">
                            <WegMotorIcon color="#94a3b8" size="w-20 h-20" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MOTOR</span>
                          </div>
                          
                          {/* INFORMAÇÕES VERTICAIS */}
                          <div className="w-full flex flex-col gap-5">
                            {/* POTÊNCIA */}
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] font-black text-slate-400 uppercase mb-1">POTÊNCIA COLETADA</span>
                              <div className="flex items-center gap-3">
                                <select 
                                  className="text-xl font-black text-slate-600 bg-transparent outline-none border-b-2 border-slate-200 appearance-none text-center px-2"
                                  value={(block.value as ComparisonData).before.cv}
                                  onChange={(e) => updateBlock(block.id, { value: { ...(block.value as ComparisonData), before: { ...(block.value as ComparisonData).before, cv: parseFloat(e.target.value) } } })}
                                  disabled={isLocked}
                                >
                                  {WEG_MOTORS.map(m => <option key={m.cv} value={m.cv}>{m.cv} CV</option>)}
                                </select>
                                <span className="text-sm font-bold text-slate-300">{(getMotorByCv((block.value as ComparisonData).before.cv)?.kw || 0).toFixed(2)} kW</span>
                              </div>
                            </div>

                            {/* CONDUTOR */}
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] font-black text-slate-400 uppercase mb-1">BITOLA DO CABO</span>
                              <div className="flex items-center gap-2 text-lg font-black text-slate-500 bg-white border border-slate-200 rounded px-4 py-1">
                                <input 
                                  className="w-16 bg-transparent outline-none text-center"
                                  value={(block.value as ComparisonData).before.cable}
                                  onChange={(e) => updateBlock(block.id, { value: { ...(block.value as ComparisonData), before: { ...(block.value as ComparisonData).before, cable: e.target.value } } })}
                                  disabled={isLocked}
                                />
                                <span className="text-xs text-slate-300">mm²</span>
                              </div>
                            </div>

                            {/* PROTEÇÃO */}
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] font-black text-slate-400 uppercase mb-1">DISPOSITIVO PROTEÇÃO</span>
                              <input 
                                className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-600 font-black uppercase text-center outline-none"
                                value={(block.value as ComparisonData).before.breaker}
                                onChange={(e) => updateBlock(block.id, { value: { ...(block.value as ComparisonData), before: { ...(block.value as ComparisonData).before, breaker: e.target.value } } })}
                                disabled={isLocked}
                                placeholder="EX: DISJUNTOR 20A"
                              />
                            </div>

                            {/* PARTIDA */}
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] font-black text-slate-400 uppercase mb-1">REGIME DE PARTIDA</span>
                              <input 
                                className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-600 font-black uppercase text-center outline-none"
                                value={(block.value as ComparisonData).before.starter}
                                onChange={(e) => updateBlock(block.id, { value: { ...(block.value as ComparisonData), before: { ...(block.value as ComparisonData).before, starter: e.target.value } } })}
                                disabled={isLocked}
                                placeholder="EX: DIRETA"
                              />
                            </div>
                          </div>
                        </div>

                        {/* COLUNA DIREITA (PROJETADA) - ESPELHO EXATO */}
                        <div className="flex-1 p-6 flex flex-col items-center gap-6 bg-white">
                          {/* ÍCONE E LEGENDA */}
                          <div className="flex flex-col items-center gap-2">
                            <WegMotorIcon color="#005792" size="w-20 h-20" />
                            <span className="text-[10px] font-black text-[#005792] uppercase tracking-widest">MOTOR</span>
                          </div>

                          {/* INFORMAÇÕES VERTICAIS */}
                          <div className="w-full flex flex-col gap-5">
                            {/* POTÊNCIA */}
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] font-black text-blue-300 uppercase mb-1">POTÊNCIA PROJETADA IE3</span>
                              <div className="flex items-center gap-3">
                                <select 
                                  className="text-xl font-black text-[#005792] bg-transparent outline-none border-b-2 border-blue-100 appearance-none text-center px-2 cursor-pointer"
                                  value={(block.value as ComparisonData).after.cv}
                                  onChange={(e) => updateBlock(block.id, { value: { ...(block.value as ComparisonData), after: { cv: parseFloat(e.target.value) } } })}
                                  disabled={isLocked}
                                >
                                  {WEG_MOTORS.map(m => <option key={m.cv} value={m.cv}>{m.cv} CV</option>)}
                                </select>
                                <span className="text-sm font-black text-blue-200">{(getMotorByCv((block.value as ComparisonData).after.cv)?.kw || 0).toFixed(2)} kW</span>
                              </div>
                            </div>

                            {/* CONDUTOR */}
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] font-black text-slate-400 uppercase mb-1">BITOLA CALCULADA</span>
                              <div className="flex items-center gap-2 text-lg font-black text-blue-900 bg-blue-50 border border-blue-100 rounded px-8 py-1">
                                <span>{calculateDimensioning(getMotorByCv((block.value as ComparisonData).after.cv)!).cableSize.replace('mm²', '')}</span>
                                <span className="text-xs text-blue-300">mm²</span>
                              </div>
                            </div>

                            {/* PROTEÇÃO */}
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] font-black text-slate-400 uppercase mb-1">PROTEÇÃO RECOMENDADA</span>
                              <div className="w-full bg-slate-800 text-white rounded px-3 py-2 text-xs font-black uppercase text-center border border-slate-900">
                                {calculateDimensioning(getMotorByCv((block.value as ComparisonData).after.cv)!).circuitBreaker}
                              </div>
                            </div>

                            {/* PARTIDA */}
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] font-black text-slate-400 uppercase mb-1">PARTIDA RECOMENDADA</span>
                              <div className="w-full bg-orange-500 text-white rounded px-3 py-2 text-[10px] font-black uppercase text-center border border-orange-600">
                                { (block.value as ComparisonData).after.cv >= 10 ? 'SOFT-STARTER SSW07' : 'PARTIDA DIRETA / CFW500' }
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* RODAPÉ TÉCNICO */}
            <div className="mt-10 border-t border-slate-100 pt-6 flex justify-between items-center opacity-40 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
              <span>CAMPO FORTE ENGENHARIA ELÉTRICA LTDA</span>
              <span>PÁGINA {pIdx + 1} DE {project.pages.length}</span>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .tool-btn { color: #94a3b8; padding: 6px 14px; border-radius: 4px; font-weight: 800; font-size: 11px; border: 1px solid #1e293b; text-transform: uppercase; transition: 0.2s; }
        .tool-btn:hover { color: white; background: #1e293b; }
        .action-btn { padding: 6px 16px; border-radius: 4px; font-weight: 900; font-size: 11px; text-transform: uppercase; transition: 0.2s; }
        
        @media print {
          .no-print, .no-print-img { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .max-w-[210mm] { width: 100% !important; max-width: 100% !important; box-shadow: none !important; margin: 0 !important; padding: 1.5cm !important; border: none !important; height: auto !important; min-height: 0 !important; }
          textarea { height: auto !important; overflow: visible !important; }
          .bg-slate-100 { background: white !important; }
          @page { size: A4; margin: 0; }
        }
        
        textarea { border: none !important; box-shadow: none !important; outline: none !important; }
        select { -webkit-appearance: none; -moz-appearance: none; appearance: none; }
      `}</style>
    </div>
  );
};

export default App;
