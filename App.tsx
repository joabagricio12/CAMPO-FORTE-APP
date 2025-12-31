
import React, { useState, useEffect, useRef } from 'react';
import { WegMotorData, BlockData, ProjectData } from './types';
import { WEG_MOTORS, getMotorByCv } from './motorData';
import { calculateDimensioning, calculateGeneralSummary } from './calculations';
import { GoogleGenAI } from "@google/genai";

const MotorIcon = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[#005792] shrink-0">
    {/* Aletas do Motor */}
    <rect x="18" y="24" width="28" height="16" rx="1" fill="white" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M22 24v16M26 24v16M30 24v16M34 24v16M38 24v16M42 24v16" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4"/>
    {/* Caixa de Ligação */}
    <rect x="24" y="20" width="16" height="4" rx="1" fill="currentColor"/>
    {/* Eixo e Ventilador */}
    <rect x="46" y="28" width="4" height="8" rx="1" fill="currentColor"/>
    <path d="M14 26v12M12 28v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    {/* Base/Pés */}
    <path d="M18 40l-2 3M46 40l2 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const App: React.FC = () => {
  const [project, setProject] = useState<ProjectData>(() => {
    const saved = localStorage.getItem('cf_ultimate_v1');
    return saved ? JSON.parse(saved) : {
      title: 'Projeto Campo Forte',
      blocks: [
        { id: 'b1', type: 'text', value: 'MEMORIAL DESCRITIVO DE INSTALAÇÃO', fontSize: 14, bold: true, align: 'center' },
        { id: 'b2', type: 'text', value: 'Introdução técnica do sistema...', fontSize: 12, align: 'justify' }
      ]
    };
  });

  const [headerImage, setHeaderImage] = useState<string | null>(() => localStorage.getItem('cf_logo_v12'));
  const [isLocked, setIsLocked] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem('cf_ultimate_v1', JSON.stringify(project)); }, [project]);
  useEffect(() => { if (headerImage) localStorage.setItem('cf_logo_v12', headerImage); }, [headerImage]);

  const addBlock = (type: 'text' | 'motor') => {
    const newBlock: BlockData = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      value: type === 'motor' ? '1' : '',
      fontSize: 12,
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
    setProject(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === blockId ? { ...b, ...updates } : b)
    }));
  };

  const removeBlock = (blockId: string) => {
    if (project.blocks.length <= 1) return;
    setProject(prev => ({
      ...prev,
      blocks: prev.blocks.filter(b => b.id !== blockId)
    }));
    setActiveBlockId(null);
  };

  const moveBlock = (blockId: string, dir: 'up' | 'down') => {
    const idx = project.blocks.findIndex(b => b.id === blockId);
    if (idx === -1) return;
    const newBlocks = [...project.blocks];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= newBlocks.length) return;
    [newBlocks[idx], newBlocks[target]] = [newBlocks[target], newBlocks[idx]];
    setProject(prev => ({ ...prev, blocks: newBlocks }));
  };

  const generateAI = async () => {
    if (isGenerating) return;
    const motors = project.blocks
      .filter(b => b.type === 'motor')
      .map(b => getMotorByCv(parseFloat(b.value)))
      .filter((m): m is WegMotorData => !!m);

    if (motors.length === 0) return alert("Adicione motores para a análise da IA.");
    
    setIsGenerating(true);
    try {
      const summary = calculateGeneralSummary(motors);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Gere uma CONCLUSÃO TÉCNICA final para este memorial. O projeto possui ${summary.motorCount} motores totais, somando ${summary.totalCv}CV. A corrente nominal de barramento é de aproximadamente ${summary.totalIn}A. Indique obrigatoriamente um ${summary.recommendedMainBreaker}. Use linguagem de Engenharia Sênior, seja direto e profissional. Não use saudações.`;
      
      const res = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { systemInstruction: "Você é um Engenheiro da Campo Forte. Produza apenas o texto técnico final de fechamento do relatório." }
      });

      const newBlock: BlockData = { 
        id: 'ai-' + Date.now(), 
        type: 'text', 
        value: `CONCLUSÃO TÉCNICA:\n\n${res.text || 'Falha ao gerar resumo.'}`, 
        fontSize: 12, 
        bold: true, 
        align: 'justify' 
      };
      
      setProject(prev => ({ ...prev, blocks: [...prev.blocks, newBlock] }));
      setActiveBlockId(newBlock.id);
    } catch (e) {
      alert("Erro na IA: Verifique sua chave API.");
    } finally {
      setIsGenerating(false);
    }
  };

  const activeBlock = project.blocks.find(b => b.id === activeBlockId);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center">
      
      {/* BARRA DE FERRAMENTAS COMPACTA */}
      <div className="fixed top-0 left-0 w-full h-10 bg-[#0f172a] shadow-lg z-[9999] no-print flex items-center justify-between px-2 border-b border-slate-800">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <span className="text-white font-black text-[10px] tracking-tight shrink-0 mr-1">CAMPO FORTE</span>
          <button onClick={() => addBlock('text')} className="tool-btn">T</button>
          <button onClick={() => addBlock('motor')} className="tool-btn">⚙️</button>
          <button onClick={() => updateBlock(activeBlockId!, { bold: !activeBlock?.bold })} className={`tool-btn ${activeBlock?.bold ? 'bg-blue-600' : ''}`}>B</button>
          <button onClick={() => updateBlock(activeBlockId!, { align: 'justify' })} className="tool-btn">≡</button>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={generateAI} disabled={isGenerating} className="action-btn bg-blue-600">{isGenerating ? '...' : 'IA RESUMO'}</button>
          <button onClick={() => window.print()} className="action-btn bg-white text-black">PDF</button>
          <button onClick={() => setIsLocked(!isLocked)} className={`action-btn ${isLocked ? 'bg-red-500' : 'bg-green-600'}`}>{isLocked ? '🔓' : '🔒'}</button>
        </div>
      </div>

      {/* DOCUMENTO ADAPTATIVO */}
      <div className="mt-10 mb-10 w-full max-w-4xl px-0 md:px-4">
        <div className="bg-white min-h-[297mm] shadow-xl relative flex flex-col p-4 md:p-12 print:p-0 print:shadow-none w-full border-x border-slate-200">
          
          {/* LOGO - POSIÇÃO SUPERIOR OTIMIZADA */}
          <div className="w-full flex justify-center mb-4 no-print-img">
            {headerImage ? (
              <img 
                src={headerImage} 
                className="max-h-12 cursor-pointer transition active:scale-95" 
                onClick={() => !isLocked && document.getElementById('logo-file')?.click()}
              />
            ) : (
              !isLocked && (
                <button 
                  onClick={() => document.getElementById('logo-file')?.click()}
                  className="text-[10px] font-bold text-slate-300 border border-dashed border-slate-200 px-8 py-2 rounded-md"
                >LOGOMARCA</button>
              )
            )}
            <input type="file" id="logo-file" className="hidden" accept="image/*" onChange={(e) => {
              const f = e.target.files?.[0];
              if(f){ const r = new FileReader(); r.onloadend = () => setHeaderImage(r.result as string); r.readAsDataURL(f); }
            }} />
          </div>

          {/* FLUXO TÉCNICO DE ALTA DENSIDADE */}
          <div className="flex flex-col w-full flex-1">
            {project.blocks.map((block) => (
              <div 
                key={block.id}
                className={`relative group/block transition-all border-l ${activeBlockId === block.id && !isLocked ? 'border-blue-400 bg-blue-50/10' : 'border-transparent'}`}
                onClick={() => !isLocked && setActiveBlockId(block.id)}
              >
                {/* CONTROLES RÁPIDOS */}
                {!isLocked && activeBlockId === block.id && (
                  <div className="absolute -right-2 top-0 flex flex-col gap-0.5 no-print z-[100]">
                    <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }} className="float-btn">↑</button>
                    <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="float-btn text-red-500">×</button>
                  </div>
                )}

                {block.type === 'text' ? (
                  <textarea
                    className="w-full bg-transparent border-none outline-none resize-none overflow-hidden text-slate-900 placeholder:text-slate-100 leading-[1.3]"
                    style={{
                      fontSize: `${block.fontSize}px`,
                      fontWeight: block.bold ? 'bold' : 'normal',
                      fontStyle: block.italic ? 'italic' : 'normal',
                      textAlign: block.align,
                      minHeight: '1em',
                      padding: '2px 0'
                    }}
                    placeholder="..."
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
                  /* WIDGET MOTOR SLIM - TAMANHO DE LINHA WORD */
                  <div className="flex items-center justify-between border-b border-slate-50 py-0.5 px-1 hover:bg-slate-50 transition min-h-[24px]">
                    <div className="flex items-center gap-2 shrink-0">
                      <MotorIcon />
                      <select
                        className="text-[12px] font-black bg-transparent border-none outline-none cursor-pointer text-[#005792] p-0 focus:ring-0"
                        value={block.value}
                        onChange={(e) => updateBlock(block.id, { value: e.target.value })}
                        disabled={isLocked}
                      >
                        {WEG_MOTORS.map(m => <option key={m.cv} value={m.cv}>{m.cv} CV</option>)}
                      </select>
                    </div>

                    <div className="flex flex-1 justify-end gap-3 md:gap-8 items-center text-[10px] md:text-[11px] font-semibold text-slate-400 overflow-hidden">
                      <span className="shrink-0"><b className="text-slate-700">{(parseFloat(block.value) * 0.735).toFixed(2)}</b>kW</span>
                      <span className="shrink-0"><b className="text-slate-700">{getMotorByCv(parseFloat(block.value))?.currentIn}</b>A</span>
                      <span className="shrink-0 text-[#005792] font-black">{calculateDimensioning(getMotorByCv(parseFloat(block.value))!).cableSize}</span>
                      <span className="shrink-0 bg-slate-100 px-1 rounded text-slate-900 font-black">{calculateDimensioning(getMotorByCv(parseFloat(block.value))!).circuitBreaker.split(' (')[0]}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="h-6"></div>
        </div>
      </div>

      <style>{`
        .tool-btn {
          color: white;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 12px;
          border-radius: 4px;
          transition: 0.1s;
        }
        .tool-btn:hover { background-color: #334155; }
        
        .action-btn {
          padding: 3px 10px;
          border-radius: 4px;
          font-weight: 900;
          font-size: 9px;
          text-transform: uppercase;
          transition: 0.2s;
        }
        
        .float-btn {
          background-color: white;
          width: 22px;
          height: 22px;
          border: 1px solid #e2e8f0;
          font-weight: 900;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border-radius: 2px;
        }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        @media print {
          .no-print, .no-print-img { display: none !important; }
          body { background: white !important; padding: 0 !important; }
          .max-w-4xl { max-width: 100% !important; width: 100% !important; margin: 0 !important; }
          .min-h-[297mm] { box-shadow: none !important; border: none !important; padding: 0 !important; }
          textarea { overflow: visible !important; height: auto !important; }
          select { -webkit-appearance: none; -moz-appearance: none; appearance: none; border: none; }
        }
        
        textarea { scrollbar-width: none; }
        textarea::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default App;
