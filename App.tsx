
import React, { useState, useEffect, useRef } from 'react';
import { WegMotorData, BlockData, ProjectData } from './types';
import { WEG_MOTORS, getMotorByCv } from './motorData';
import { calculateDimensioning, calculateGeneralSummary } from './calculations';
import { GoogleGenAI } from "@google/genai";

const MotorIcon = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-[#005792]">
    <rect x="12" y="24" width="32" height="20" rx="1" stroke="currentColor" strokeWidth="3" fill="white"/>
    <rect x="44" y="30" width="6" height="8" rx="1" fill="currentColor"/>
    <circle cx="28" cy="34" r="5" stroke="currentColor" strokeWidth="2" fill="#f0f9ff"/>
  </svg>
);

const App: React.FC = () => {
  const [project, setProject] = useState<ProjectData>(() => {
    const saved = localStorage.getItem('cf_word_v11');
    return saved ? JSON.parse(saved) : {
      title: 'Projeto Campo Forte',
      blocks: [
        { id: 'b1', type: 'text', value: 'MEMORIAL DESCRITIVO DE ENGENHARIA ELÉTRICA', fontSize: 20, bold: true, align: 'center' },
        { id: 'b2', type: 'text', value: 'Digite aqui a introdução técnica do seu projeto...', fontSize: 13, align: 'justify' }
      ]
    };
  });

  const [headerImage, setHeaderImage] = useState<string | null>(() => localStorage.getItem('cf_logo_v11'));
  const [isLocked, setIsLocked] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem('cf_word_v11', JSON.stringify(project)); }, [project]);
  useEffect(() => { if (headerImage) localStorage.setItem('cf_logo_v11', headerImage); }, [headerImage]);

  const addBlock = (type: 'text' | 'motor') => {
    const newBlock: BlockData = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      value: type === 'motor' ? '1' : '',
      fontSize: 14,
      align: 'left'
    };
    
    const activeIdx = project.blocks.findIndex(b => b.id === activeBlockId);
    const newBlocks = [...project.blocks];
    if (activeIdx !== -1) {
      newBlocks.splice(activeIdx + 1, 0, newBlock);
    } else {
      newBlocks.push(newBlock);
    }
    
    setProject({ ...project, blocks: newBlocks });
    setActiveBlockId(newBlock.id);
  };

  const updateBlock = (blockId: string, updates: Partial<BlockData>) => {
    setProject({
      ...project,
      blocks: project.blocks.map(b => b.id === blockId ? { ...b, ...updates } : b)
    });
  };

  const removeBlock = (blockId: string) => {
    if (project.blocks.length <= 1) return;
    setProject({
      ...project,
      blocks: project.blocks.filter(b => b.id !== blockId)
    });
    setActiveBlockId(null);
  };

  const moveBlock = (blockId: string, dir: 'up' | 'down') => {
    const idx = project.blocks.findIndex(b => b.id === blockId);
    if (idx === -1) return;
    const newBlocks = [...project.blocks];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= newBlocks.length) return;
    [newBlocks[idx], newBlocks[target]] = [newBlocks[target], newBlocks[idx]];
    setProject({ ...project, blocks: newBlocks });
  };

  const generateAI = async () => {
    if (isGenerating) return;
    const motors = project.blocks
      .filter(b => b.type === 'motor')
      .map(b => getMotorByCv(parseFloat(b.value)))
      .filter((m): m is WegMotorData => !!m);

    if (motors.length === 0) return alert("Adicione motores para a IA analisar.");
    
    setIsGenerating(true);
    try {
      const summary = calculateGeneralSummary(motors);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Como Engenheiro Sênior da Campo Forte, escreva um parágrafo técnico sobre um projeto com ${summary.motorCount} motores WEG IE3 (${summary.totalCv}CV totais). Cite o disjuntor geral de ${summary.recommendedMainBreaker}. Seja formal.`;
      
      const res = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { systemInstruction: "Você é um Engenheiro Eletricista Sênior. Produza textos puramente técnicos para memoriais descritivos." }
      });

      const newBlock: BlockData = { id: 'ai-' + Date.now(), type: 'text', value: res.text || '', fontSize: 13, align: 'justify' };
      setProject({ ...project, blocks: [...project.blocks, newBlock] });
      setActiveBlockId(newBlock.id);
    } catch (e) {
      alert("Erro na IA.");
    } finally {
      setIsGenerating(false);
    }
  };

  const activeBlock = project.blocks.find(b => b.id === activeBlockId);

  return (
    <div className="min-h-screen bg-[#e2e8f0] flex flex-col items-center">
      
      {/* TOOLBAR ESTILO OFFICE (FIXA) */}
      <div className="fixed top-0 left-0 w-full h-14 bg-[#1e293b] shadow-2xl z-[9999] no-print flex items-center justify-between px-8 border-b border-slate-700">
        <div className="flex items-center gap-6">
          <span className="text-white font-black text-xl tracking-tighter">CAMPO FORTE</span>
          
          <div className="h-8 w-px bg-slate-700"></div>

          <div className="flex bg-slate-800 rounded p-1 gap-1">
            <button onClick={() => addBlock('text')} className="toolbar-btn" title="Novo Texto">TEXTO</button>
            <button onClick={() => addBlock('motor')} className="toolbar-btn" title="Inserir Motor">MOTOR</button>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => updateBlock(activeBlockId!, { fontSize: (activeBlock?.fontSize || 14) + 1 })} className="format-btn">A+</button>
            <button onClick={() => updateBlock(activeBlockId!, { fontSize: Math.max(8, (activeBlock?.fontSize || 14) - 1) })} className="format-btn">A-</button>
            <button onClick={() => updateBlock(activeBlockId!, { bold: !activeBlock?.bold })} className={`format-btn font-bold ${activeBlock?.bold ? 'bg-blue-600 text-white' : ''}`}>B</button>
            <button onClick={() => updateBlock(activeBlockId!, { italic: !activeBlock?.italic })} className={`format-btn italic ${activeBlock?.italic ? 'bg-blue-600 text-white' : ''}`}>I</button>
          </div>

          <div className="flex bg-slate-800 rounded p-1 gap-1">
            <button onClick={() => updateBlock(activeBlockId!, { align: 'left' })} className={`format-btn px-2 ${activeBlock?.align === 'left' ? 'bg-blue-600' : ''}`}>⇤</button>
            <button onClick={() => updateBlock(activeBlockId!, { align: 'center' })} className={`format-btn px-2 ${activeBlock?.align === 'center' ? 'bg-blue-600' : ''}`}>↔</button>
            <button onClick={() => updateBlock(activeBlockId!, { align: 'right' })} className={`format-btn px-2 ${activeBlock?.align === 'right' ? 'bg-blue-600' : ''}`}>⇥</button>
            <button onClick={() => updateBlock(activeBlockId!, { align: 'justify' })} className={`format-btn px-2 ${activeBlock?.align === 'justify' ? 'bg-blue-600' : ''}`}>≡</button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={generateAI} disabled={isGenerating} className="action-btn bg-blue-600">
            {isGenerating ? 'PROCESSANDO...' : 'IA TÉCNICA'}
          </button>
          <button onClick={() => window.print()} className="action-btn bg-white text-slate-900">GERAR PDF</button>
          <button onClick={() => setIsLocked(!isLocked)} className={`action-btn ${isLocked ? 'bg-red-500' : 'bg-green-600'}`}>
            {isLocked ? 'VISUALIZAR' : 'EDITAR'}
          </button>
        </div>
      </div>

      {/* ÁREA DO DOCUMENTO A4 */}
      <div className="mt-20 mb-20">
        <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl p-[25mm] pt-[45mm] pb-[30mm] relative flex flex-col border border-slate-300 print:shadow-none print:border-none print:m-0">
          
          {/* LOGO CENTRALIZADA */}
          <div className="absolute top-[12mm] left-0 w-full flex justify-center no-print-img">
            {headerImage ? (
              <img 
                src={headerImage} 
                className="max-h-[22mm] cursor-pointer" 
                onClick={() => !isLocked && document.getElementById('logo-upload')?.click()}
              />
            ) : (
              !isLocked && (
                <button 
                  onClick={() => document.getElementById('logo-upload')?.click()}
                  className="text-[10px] font-bold text-slate-300 border-2 border-dashed border-slate-100 px-12 py-3 rounded-lg hover:border-blue-200 transition"
                >CLIQUE PARA ADICIONAR LOGOMARCA DO PROJETO</button>
              )
            )}
            <input type="file" id="logo-upload" className="hidden" accept="image/*" onChange={(e) => {
              const f = e.target.files?.[0];
              if(f){ const r = new FileReader(); r.onloadend = () => setHeaderImage(r.result as string); r.readAsDataURL(f); }
            }} />
          </div>

          {/* FLUXO DE TEXTO E MOTORES */}
          <div className="flex flex-col w-full flex-1">
            {project.blocks.map((block) => (
              <div 
                key={block.id}
                className={`relative mb-2 group/block transition-all rounded-md ${activeBlockId === block.id && !isLocked ? 'bg-blue-50/30 ring-1 ring-blue-100' : ''}`}
                onClick={() => !isLocked && setActiveBlockId(block.id)}
              >
                {/* CONTROLES DE FLUXO (NO-PRINT) */}
                {!isLocked && activeBlockId === block.id && (
                  <div className="absolute -left-12 top-0 flex flex-col gap-1 no-print">
                    <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }} className="ctrl-btn">↑</button>
                    <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }} className="ctrl-btn">↓</button>
                    <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="ctrl-btn text-red-500">×</button>
                  </div>
                )}

                {block.type === 'text' ? (
                  <textarea
                    className="w-full bg-transparent border-none outline-none resize-none overflow-hidden placeholder:text-slate-100 leading-relaxed text-slate-900"
                    style={{
                      fontSize: `${block.fontSize}px`,
                      fontWeight: block.bold ? 'bold' : 'normal',
                      fontStyle: block.italic ? 'italic' : 'normal',
                      textAlign: block.align,
                      minHeight: '1.5em'
                    }}
                    placeholder="Inicie a redação do memorial..."
                    value={block.value}
                    onChange={(e) => {
                      updateBlock(block.id, { value: e.target.value });
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    onFocus={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    disabled={isLocked}
                  />
                ) : (
                  /* WIDGET MOTOR TÉCNICO SIMPLIFICADO */
                  <div className="my-6 border-y border-slate-100 py-6 bg-[#fcfdfe] rounded-xl px-8 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-6">
                      <MotorIcon />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">MOTOR</span>
                        <select
                          className="text-xl font-black bg-transparent border-none outline-none cursor-pointer text-[#005792] p-0"
                          value={block.value}
                          onChange={(e) => updateBlock(block.id, { value: e.target.value })}
                          disabled={isLocked}
                        >
                          {WEG_MOTORS.map(m => <option key={m.cv} value={m.cv}>{m.cv} CV | Trifásico W22</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-10 border-l border-slate-100 pl-10">
                      <div className="flex flex-col text-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">Potência</span>
                        <span className="text-sm font-black text-slate-700">{(parseFloat(block.value) * 0.735).toFixed(2)} kW</span>
                      </div>
                      <div className="flex flex-col text-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">Corrente (In)</span>
                        <span className="text-sm font-black text-slate-700">{getMotorByCv(parseFloat(block.value))?.currentIn} A</span>
                      </div>
                      <div className="flex flex-col text-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">Cabo Mínimo</span>
                        <span className="text-sm font-black text-[#005792]">{calculateDimensioning(getMotorByCv(parseFloat(block.value))!).cableSize}</span>
                      </div>
                      <div className="flex flex-col text-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">Disjuntor</span>
                        <span className="text-sm font-black text-slate-700">{calculateDimensioning(getMotorByCv(parseFloat(block.value))!).circuitBreaker.split(' (')[0]}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* RODAPÉ DO MEMORIAL */}
          <div className="mt-12 border-t border-slate-100 pt-6 flex justify-between items-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
            <span>MEMORIAL DESCRITIVO TÉCNICO</span>
            <span>CAMPO FORTE ENGENHARIA</span>
          </div>
        </div>
      </div>

      <style>{`
        .toolbar-btn {
          color: white;
          padding: 4px 12px;
          border-radius: 4px;
          font-weight: 900;
          font-size: 11px;
          transition: 0.2s;
        }
        .toolbar-btn:hover { background-color: #334155; }
        
        .format-btn {
          color: #94a3b8;
          padding: 6px 10px;
          border-radius: 4px;
          font-weight: 800;
          font-size: 12px;
          transition: 0.15s;
        }
        .format-btn:hover { color: white; background-color: #334155; }
        
        .action-btn {
          padding: 8px 18px;
          border-radius: 6px;
          font-weight: 900;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: 0.2s;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .ctrl-btn {
          background-color: white;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          font-weight: 900;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: 0.2s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .ctrl-btn:hover { background-color: #f8fafc; transform: scale(1.1); color: #005792; }

        @media print {
          body { background: white !important; margin: 0 !important; }
          .min-h-[297mm] { box-shadow: none !important; margin: 0 !important; border: none !important; width: 100% !important; }
          .no-print, .no-print-img { display: none !important; }
          textarea { overflow: visible !important; height: auto !important; width: 100% !important; }
        }
        
        textarea { scrollbar-width: none; }
        textarea::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default App;
