
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
    const saved = localStorage.getItem('cf_ultimate_v6');
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

  useEffect(() => { localStorage.setItem('cf_ultimate_v6', JSON.stringify(project)); }, [project]);
  useEffect(() => { if (headerImage) localStorage.setItem('cf_logo_v12', headerImage); }, [headerImage]);

  const addBlock = (type: 'text' | 'comparison' | 'summary_table', pageId: string) => {
    const newBlock: BlockData = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      value: type === 'comparison' ? { before: { cv: 1, cable: '2.5', breaker: 'N/A' }, after: { cv: 1 } } : '',
      fontSize: 11,
      align: 'left'
    };
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

  const generateAI = async () => {
    if (isGenerating) return;
    const afterMotors = project.pages.flatMap(p => p.blocks)
      .filter(b => b.type === 'comparison')
      .map(b => getMotorByCv((b.value as ComparisonData).after.cv))
      .filter((m): m is WegMotorData => !!m);

    if (afterMotors.length === 0) return alert("Adicione motores para gerar o quadro técnico.");

    setIsGenerating(true);
    const summary = calculateGeneralSummary(afterMotors);
    
    const lastPageId = project.pages[project.pages.length - 1].id;
    addBlock('summary_table', lastPageId);
    setIsGenerating(false);
  };

  const renderSummaryTable = (summary: ProjectSummary) => (
    <div className="mt-4 border border-slate-200 rounded-sm overflow-hidden text-[10px]">
      <div className="bg-slate-100 p-2 font-black border-b border-slate-200 uppercase tracking-tighter text-slate-700">
        Quadro de Cargas Projetado - Tecnologia WEG IE3
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="p-1 border-r border-slate-100">Item</th>
            <th className="p-1 border-r border-slate-100">Motor (CV/kW)</th>
            <th className="p-1 border-r border-slate-100">Corrente (In)</th>
            <th className="p-1 border-r border-slate-100">Condutor</th>
            <th className="p-1 border-r border-slate-100">Proteção</th>
            <th className="p-1">Manobra</th>
          </tr>
        </thead>
        <tbody>
          {summary.details.map((d, i) => (
            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
              <td className="p-1 border-r border-slate-100">{i + 1}</td>
              <td className="p-1 border-r border-slate-100 font-bold">{d.motor.cv} CV ({d.motor.kw} kW)</td>
              <td className="p-1 border-r border-slate-100">{d.motor.currentIn} A</td>
              <td className="p-1 border-r border-slate-100 text-blue-700 font-bold">{d.cableSize}</td>
              <td className="p-1 border-r border-slate-100">{d.circuitBreaker}</td>
              <td className="p-1">{d.contactor}</td>
            </tr>
          ))}
          <tr className="bg-slate-100 font-black">
            <td colSpan={2} className="p-2">TOTALIZAÇÃO: {summary.motorCount} Motores / {summary.totalCv} CV</td>
            <td className="p-2">{summary.totalIn} A</td>
            <td colSpan={3} className="p-2 text-right text-blue-800">{summary.recommendedMainBreaker}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-200 flex flex-col items-center">
      
      {/* TOOLBAR SUPERIOR */}
      <div className="fixed top-0 left-0 w-full h-10 bg-[#001d3d] shadow-2xl z-[9999] no-print flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="text-white font-black text-[11px] tracking-tight pr-3 border-r border-slate-700">CAMPO FORTE</span>
          <button onClick={() => addBlock('text', project.pages[0].id)} className="tool-btn">TEXTO</button>
          <button onClick={() => addBlock('comparison', project.pages[0].id)} className="tool-btn">ADICIONAR MOTOR</button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={generateAI} className="action-btn bg-blue-600">QUADRO TÉCNICO</button>
          <button onClick={() => window.print()} className="action-btn bg-white text-black">SALVAR PDF</button>
          <button onClick={() => setIsLocked(!isLocked)} className={`action-btn ${isLocked ? 'bg-red-500' : 'bg-green-600'}`}>{isLocked ? 'DESTRAVAR' : 'TRAVAR'}</button>
        </div>
      </div>

      {/* PÁGINAS DO MEMORIAL */}
      <div className="mt-14 mb-20 w-full flex flex-col items-center gap-4">
        {project.pages.map((page) => (
          <div key={page.id} className="bg-white w-full max-w-[210mm] min-h-[297mm] p-12 md:p-14 relative flex flex-col shadow-lg border-none print:shadow-none print:p-8">
            
            {/* LOGOMARCA */}
            <div className="w-full flex justify-center mb-6 no-print-img">
              {headerImage ? (
                <img src={headerImage} className="max-h-12 cursor-pointer" onClick={() => !isLocked && document.getElementById('logo-up')?.click()} />
              ) : (
                !isLocked && <button onClick={() => document.getElementById('logo-up')?.click()} className="text-[9px] text-slate-300 border border-dashed p-4 uppercase font-black">Adicionar Logo Campo Forte</button>
              )}
              <input type="file" id="logo-up" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0];
                if(f){ const r = new FileReader(); r.onloadend = () => setHeaderImage(r.result as string); r.readAsDataURL(f); }
              }} />
            </div>

            {/* CABEÇALHO DA TABELA DE MOTORES (FIXO) */}
            <div className="flex items-center w-full gap-2 text-[8px] font-black text-slate-400 uppercase mb-1 border-b border-slate-100 pb-1 no-print">
              <div className="flex-1 pl-6">Situação Atual (Antes)</div>
              <div className="flex-[1.5] pl-6">Situação Projetada (Depois)</div>
            </div>

            {/* CONTEÚDO DINÂMICO */}
            <div className="flex flex-col flex-1">
              {page.blocks.map((block) => (
                <div key={block.id} className={`relative group mb-0.5 ${activeBlockId === block.id && !isLocked ? 'bg-blue-50/5' : ''}`} onClick={() => !isLocked && setActiveBlockId(block.id)}>
                  
                  {!isLocked && activeBlockId === block.id && (
                    <div className="absolute -left-8 top-0 flex no-print">
                      <button onClick={() => removeBlock(block.id)} className="text-red-400 font-bold">×</button>
                    </div>
                  )}

                  {block.type === 'text' ? (
                    <textarea
                      className="w-full bg-transparent border-none outline-none resize-none overflow-hidden text-slate-900 leading-tight p-0 m-0"
                      style={{ fontSize: `${block.fontSize}px`, fontWeight: block.bold ? 'bold' : 'normal', textAlign: block.align }}
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
                    /* WIDGET MOTOR ALINHADO (ESTILO PLANILHA) */
                    <div className="flex items-center w-full gap-2 h-7 border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                      {/* LADO ESQUERDO: ANTES */}
                      <div className="flex-1 flex items-center border-r border-slate-100 pr-2">
                        <WegMotorIcon color="#cbd5e1" />
                        
                        {/* CV / kW */}
                        <div className="w-16 flex flex-col ml-1">
                          <select 
                            className="text-[10px] font-black text-slate-400 bg-transparent outline-none p-0 h-3 leading-none appearance-none"
                            value={(block.value as ComparisonData).before.cv}
                            onChange={(e) => updateBlock(block.id, { value: { ...(block.value as ComparisonData), before: { ...(block.value as ComparisonData).before, cv: parseFloat(e.target.value) } } })}
                            disabled={isLocked}
                          >
                            {WEG_MOTORS.map(m => <option key={m.cv} value={m.cv}>{m.cv}CV</option>)}
                          </select>
                          <span className="text-[7px] text-slate-300 font-bold">{(getMotorByCv((block.value as ComparisonData).before.cv)?.kw || 0).toFixed(2)} kW</span>
                        </div>

                        {/* CABO EDITÁVEL */}
                        <div className="flex items-center gap-0.5 ml-auto">
                          <input 
                            className="w-6 text-[10px] bg-transparent border-none outline-none text-slate-400 font-bold text-right"
                            value={(block.value as ComparisonData).before.cable}
                            onChange={(e) => updateBlock(block.id, { value: { ...(block.value as ComparisonData), before: { ...(block.value as ComparisonData).before, cable: e.target.value } } })}
                            disabled={isLocked}
                          />
                          <span className="text-[7px] text-slate-300 font-black">mm²</span>
                        </div>

                        {/* PROTEÇÃO EDITÁVEL */}
                        <input 
                          className="w-12 text-[8px] bg-transparent border-none outline-none text-slate-300 font-bold ml-2 uppercase truncate"
                          value={(block.value as ComparisonData).before.breaker}
                          onChange={(e) => updateBlock(block.id, { value: { ...(block.value as ComparisonData), before: { ...(block.value as ComparisonData).before, breaker: e.target.value } } })}
                          disabled={isLocked}
                          placeholder="PROT"
                        />
                      </div>

                      {/* LADO DIREITO: DEPOIS (DIMENSIONAMENTO) */}
                      <div className="flex-[1.5] flex items-center pl-1">
                        <WegMotorIcon color="#005792" />
                        
                        {/* CV / kW Projetado */}
                        <div className="w-20 flex flex-col ml-1">
                          <select 
                            className="text-[11px] font-black text-[#005792] bg-transparent outline-none p-0 h-4 leading-none cursor-pointer"
                            value={(block.value as ComparisonData).after.cv}
                            onChange={(e) => updateBlock(block.id, { value: { ...(block.value as ComparisonData), after: { cv: parseFloat(e.target.value) } } })}
                            disabled={isLocked}
                          >
                            {WEG_MOTORS.map(m => <option key={m.cv} value={m.cv}>{m.cv} CV W22</option>)}
                          </select>
                          <span className="text-[8px] text-blue-300 font-black">{(getMotorByCv((block.value as ComparisonData).after.cv)?.kw || 0).toFixed(2)} kW</span>
                        </div>
                        
                        {/* RESULTADOS ALINHADOS EM COLUNAS */}
                        <div className="flex-1 flex justify-between ml-4">
                          {/* Coluna Cabo */}
                          <div className="w-14 flex items-center gap-0.5">
                            <span className="text-[10px] font-black text-blue-700">{calculateDimensioning(getMotorByCv((block.value as ComparisonData).after.cv)!).cableSize.replace('mm²', '')}</span>
                            <span className="text-[7px] text-blue-300 font-black uppercase">mm²</span>
                          </div>

                          {/* Coluna Proteção */}
                          <div className="w-24 text-[9px] font-black text-slate-700 truncate">
                            {calculateDimensioning(getMotorByCv((block.value as ComparisonData).after.cv)!).circuitBreaker}
                          </div>

                          {/* Coluna Partida */}
                          <div className="w-16 text-right text-[8px] font-black text-orange-600 uppercase">
                            {(block.value as ComparisonData).after.cv >= 10 ? 'SOFT-STARTER' : 'PART. DIRETA'}
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
              <span>Página {project.pages.findIndex(p => p.id === page.id) + 1} de {project.pages.length}</span>
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
          .max-w-[210mm] { width: 100% !important; max-width: 100% !important; shadow: none !important; border: none !important; padding: 1cm !important; }
          textarea { height: auto !important; overflow: visible !important; }
          .bg-slate-200 { background: white !important; }
        }
        
        textarea { border: none !important; box-shadow: none !important; outline: none !important; }
        select { -webkit-appearance: none; -moz-appearance: none; appearance: none; }
      `}</style>
    </div>
  );
};

export default App;
