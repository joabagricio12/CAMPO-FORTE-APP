
import React, { useState, useEffect, useRef } from 'react';
import { WegMotorData } from './types';
import { WEG_MOTORS, getMotorByCv } from './motorData';
import { calculateDimensioning, calculateGeneralSummary } from './calculations';

const MotorIcon = () => (
  <svg width="24" height="24" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="50" y="70" width="100" height="80" rx="2" fill="#334155" />
    <rect x="35" y="85" width="15" height="50" fill="#334155" />
    <rect x="150" y="85" width="10" height="50" fill="#334155" />
    <rect x="160" y="100" width="25" height="20" fill="#334155" />
    <path d="M80 70V55H120V70" stroke="#334155" strokeWidth="5" strokeLinecap="round"/>
    <text x="80" y="115" fill="#fff" fontSize="14" fontWeight="900" style={{fontFamily: 'sans-serif'}}>WEG</text>
  </svg>
);

const App: React.FC = () => {
  const [reportTitle, setReportTitle] = useState('');
  const [contentItems, setContentItems] = useState<{id: string, type: 'text' | 'motor' | 'summary' | 'list', value: string}[]>([
    { id: 'initial-text', type: 'text', value: '' }
  ]);
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [footerResponsible, setFooterResponsible] = useState('');
  const [footerLocationDate, setFooterLocationDate] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const currentDate = new Date().toLocaleDateString('pt-BR');

  useEffect(() => {
    const saved = localStorage.getItem('campo-forte-word-v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      setReportTitle(parsed.reportTitle || '');
      setContentItems(parsed.contentItems || [{ id: 'initial-text', type: 'text', value: '' }]);
      setHeaderImage(parsed.headerImage || null);
      setFooterResponsible(parsed.footerResponsible || '');
      setFooterLocationDate(parsed.footerLocationDate || '');
    }
  }, []);

  useEffect(() => {
    const data = { reportTitle, contentItems, headerImage, footerResponsible, footerLocationDate };
    localStorage.setItem('campo-forte-word-v1', JSON.stringify(data));
  }, [reportTitle, contentItems, headerImage, footerResponsible, footerLocationDate]);

  const addMotor = () => {
    if (isLocked) return;
    setContentItems([...contentItems, { id: Math.random().toString(36).substr(2, 9), type: 'motor', value: '1' }]);
  };

  const addText = () => {
    if (isLocked) return;
    setContentItems([...contentItems, { id: Math.random().toString(36).substr(2, 9), type: 'text', value: '' }]);
  };

  const addSummary = () => {
    if (isLocked) return;
    setContentItems([...contentItems, { id: Math.random().toString(36).substr(2, 9), type: 'summary', value: 'general' }]);
  };

  const addMaterialsList = () => {
    if (isLocked) return;
    setContentItems([...contentItems, { id: Math.random().toString(36).substr(2, 9), type: 'list', value: '' }]);
  };

  const removeItem = (id: string) => {
    if (isLocked) return;
    if (contentItems.length <= 1) return;
    setContentItems(contentItems.filter(item => item.id !== id));
  };

  const updateItem = (id: string, value: string) => {
    if (isLocked) return;
    setContentItems(contentItems.map(item => item.id === id ? { ...item, value } : item));
  };

  const handleHeaderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setHeaderImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    const canvas = await (window as any).html2canvas(reportRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new (window as any).jspdf.jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    let heightLeft = pdfHeight;
    let position = 0;
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;
    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }
    pdf.save(`CAMPO_FORTE_${Date.now()}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-20 font-sans text-slate-900">
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 no-print flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2 overflow-x-auto">
          <div className="bg-blue-600 text-white px-2 py-1 rounded font-black text-xs">CAMPO FORTE</div>
          <div className="flex gap-1">
            <button onClick={addMotor} className="bg-slate-800 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase transition hover:bg-black whitespace-nowrap">+ MOTOR</button>
            <button onClick={addText} className="bg-slate-800 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase transition hover:bg-black whitespace-nowrap">+ TEXTO</button>
            <button onClick={addSummary} className="bg-amber-600 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase transition hover:bg-amber-700 whitespace-nowrap">+ RESUMO</button>
            <button onClick={addMaterialsList} className="bg-emerald-600 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase transition hover:bg-emerald-700 whitespace-nowrap">+ LISTA MATERIAIS</button>
          </div>
          <button onClick={() => setIsLocked(!isLocked)} className={`${isLocked ? 'bg-red-500' : 'bg-blue-600'} text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase transition whitespace-nowrap ml-2`}>
            {isLocked ? 'DESBLOQUEAR' : 'BLOQUEAR PARA PDF'}
          </button>
        </div>
        <button onClick={generatePDF} className="bg-white border border-slate-300 px-4 py-1.5 rounded text-[10px] font-bold uppercase transition hover:bg-slate-50 shrink-0 ml-4">PDF</button>
      </nav>

      <div className="max-w-[210mm] mx-auto mt-8 mb-20 shadow-2xl transition-all duration-300">
        <div ref={reportRef} className="bg-white min-h-[297mm] p-[20mm] relative flex flex-col word-canvas" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
          
          {/* Header Section */}
          <header className="mb-10 flex flex-col items-center">
            {headerImage ? (
              <img src={headerImage} alt="Logo" className="max-h-24 mb-6 object-contain" />
            ) : (
              <div className="no-print mb-6 border border-dashed border-slate-300 p-8 rounded text-[10px] text-slate-400 cursor-pointer w-full text-center hover:bg-slate-50 transition" onClick={() => document.getElementById('header-input')?.click()}>
                [ CLIQUE PARA ADICIONAR LOGO ]
                <input id="header-input" type="file" className="hidden" onChange={handleHeaderUpload} />
              </div>
            )}
            <input 
              className="w-full text-center text-3xl font-bold uppercase bg-transparent border-none focus:outline-none placeholder-slate-200" 
              placeholder="TÍTULO DO DOCUMENTO" 
              value={reportTitle} 
              onChange={(e) => setReportTitle(e.target.value)} 
              disabled={isLocked} 
            />
            <div className="w-1/3 h-0.5 bg-slate-900 mt-2"></div>
          </header>

          <div className="flex flex-col flex-1 gap-6">
            {contentItems.map((item, index) => {
              if (item.type === 'text') {
                return (
                  <div key={item.id} className="relative group">
                    <textarea 
                      className="w-full text-lg leading-[32px] text-justify bg-transparent resize-none focus:outline-none placeholder-slate-200 p-0 lined-textarea" 
                      placeholder="Comece a digitar aqui..." 
                      rows={1} 
                      value={item.value} 
                      onChange={(e) => updateItem(item.id, e.target.value)} 
                      disabled={isLocked} 
                      style={{ height: 'auto', minHeight: '32px' }} 
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }} 
                    />
                    {!isLocked && (
                      <button onClick={() => removeItem(item.id)} className="absolute -left-10 top-0 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all no-print text-2xl leading-none">×</button>
                    )}
                  </div>
                );
              } else if (item.type === 'list') {
                return (
                  <div key={item.id} className="mt-12 pt-12 page-break-sheet flex flex-col min-h-[250mm] border-t border-slate-100 relative">
                    <div className="flex justify-between items-center mb-8 border-b-2 border-slate-900 pb-2">
                      <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-slate-900">LISTA DE MATERIAIS</h2>
                      {!isLocked && (
                        <button onClick={() => removeItem(item.id)} className="bg-red-50 text-red-500 px-3 py-1 rounded text-[10px] font-black no-print hover:bg-red-100 transition">Remover Folha</button>
                      )}
                    </div>
                    <textarea 
                      className="w-full flex-1 text-lg leading-[32px] bg-transparent resize-none focus:outline-none placeholder-slate-200 py-4 border-none lined-textarea"
                      placeholder="Liste os componentes aqui..."
                      value={item.value}
                      onChange={(e) => updateItem(item.id, e.target.value)}
                      disabled={isLocked}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                    />
                    <div className="mt-auto pt-8 flex justify-between items-center italic text-slate-500 text-sm border-t border-slate-50">
                      <span>Campo Forte - Eng. Elétrica</span>
                      <span>Emitido em: {currentDate}</span>
                    </div>
                  </div>
                );
              } else if (item.type === 'motor') {
                const motor = getMotorByCv(parseFloat(item.value));
                const res = motor ? calculateDimensioning(motor) : null;
                return (
                  <div key={item.id} className="relative my-6 group self-center w-full max-w-2xl no-lined-bg">
                    {!isLocked && <button onClick={() => removeItem(item.id)} className="absolute -right-8 -top-2 bg-slate-900 text-white w-6 h-6 rounded-full text-xs flex items-center justify-center no-print z-20 hover:bg-red-600 transition shadow-lg">×</button>}
                    <div className="border-2 border-slate-900 p-6 bg-slate-50 page-break flex flex-col gap-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                        <div className="flex items-center gap-4">
                          <MotorIcon />
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-500 uppercase leading-none">Memorial de Cálculo</span>
                            <select 
                              className="text-lg font-black bg-transparent focus:outline-none border-none p-0 cursor-pointer no-print appearance-none text-slate-900"
                              value={item.value}
                              onChange={(e) => updateItem(item.id, e.target.value)}
                              disabled={isLocked}
                            >
                              {WEG_MOTORS.map(m => <option key={m.cv} value={m.cv}>{m.cv} CV - Trifásico</option>)}
                            </select>
                            <span className="text-lg font-black hidden print:block uppercase">{item.value} CV</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-black text-blue-600 block uppercase">WEG W22</span>
                          <span className="text-[12px] font-black uppercase text-slate-900">Eficiência IE3</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                        <div className="flex justify-between border-b border-slate-200 py-1"><span className="text-[11px] text-slate-400 font-bold uppercase">Corrente Nominal</span><span className="text-[11px] font-black text-slate-900">{res?.motor.currentIn} A</span></div>
                        <div className="flex justify-between border-b border-slate-200 py-1"><span className="text-[11px] text-slate-400 font-bold uppercase">Cabo Recomendado</span><span className="text-[11px] font-black text-blue-700">{res?.cableSize}</span></div>
                        <div className="flex justify-between border-b border-slate-200 py-1"><span className="text-[11px] text-slate-400 font-bold uppercase">Disjuntor Sugerido</span><span className="text-[11px] font-black text-slate-900">{res?.circuitBreaker}</span></div>
                        <div className="flex justify-between border-b border-slate-200 py-1"><span className="text-[11px] text-slate-400 font-bold uppercase">Contatora</span><span className="text-[11px] font-black text-slate-900">{res?.contactor}</span></div>
                        {res?.softStarter && (
                          <div className="col-span-2 flex justify-between bg-white px-3 py-2 border border-slate-900 mt-2">
                            <span className="text-[10px] text-slate-900 font-black uppercase italic">Partida Sugerida:</span>
                            <span className="text-[11px] font-black text-blue-800">{res.softStarter}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              } else if (item.type === 'summary') {
                const projectMotors = contentItems
                  .filter(i => i.type === 'motor')
                  .map(i => getMotorByCv(parseFloat(i.value)))
                  .filter((m): m is WegMotorData => !!m);
                
                const summary = calculateGeneralSummary(projectMotors);
                
                return (
                  <div key={item.id} className="relative my-8 group self-center w-full max-w-2xl no-lined-bg">
                    {!isLocked && <button onClick={() => removeItem(item.id)} className="absolute -right-8 -top-2 bg-slate-900 text-white w-6 h-6 rounded-full text-xs flex items-center justify-center no-print z-20 hover:bg-red-600 transition shadow-lg">×</button>}
                    
                    <div className="border-2 border-slate-900 p-8 bg-white page-break flex flex-col gap-6 shadow-xl">
                      <div className="flex items-center justify-between border-b-4 border-slate-900 pb-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Quadro de Cargas</span>
                          <h3 className="text-2xl font-black uppercase text-slate-900">Resumo Técnico Geral</h3>
                        </div>
                        <div className="bg-slate-900 text-white px-4 py-2 text-xl font-black">{summary.motorCount} Eq.</div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                        <div className="flex justify-between border-b border-slate-100 py-1"><span className="text-[12px] text-slate-500 font-bold uppercase">Potência Total</span><span className="text-[12px] font-black">{summary.totalCv} CV</span></div>
                        <div className="flex justify-between border-b border-slate-100 py-1"><span className="text-[12px] text-slate-500 font-bold uppercase">Corrente Nominal</span><span className="text-[12px] font-black">{summary.totalIn} A</span></div>
                        <div className="flex justify-between border-b border-slate-100 py-1"><span className="text-[12px] text-slate-500 font-bold uppercase">Pico Estimado</span><span className="text-[12px] font-black text-red-600">{summary.totalIp.toFixed(1)} A</span></div>
                        <div className="flex justify-between border-b border-slate-900 py-1"><span className="text-[12px] text-slate-500 font-bold uppercase">Disjuntor Geral</span><span className="text-[12px] font-black">{summary.recommendedMainBreaker}</span></div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>

          <footer className="mt-24 pt-12 border-t border-slate-200 grid grid-cols-2 gap-16 relative z-10 footer-main">
            <div className="text-center">
              <textarea 
                className="w-full text-center text-sm font-bold border-b border-slate-900 bg-transparent focus:outline-none placeholder-slate-200 mb-3 py-1 resize-none overflow-hidden"
                placeholder="NOME DO RESPONSÁVEL"
                rows={1}
                value={footerResponsible}
                onChange={(e) => setFooterResponsible(e.target.value)}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
                disabled={isLocked}
              />
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Engenheiro Responsável</p>
            </div>
            <div className="text-center">
              <textarea 
                className="w-full text-center text-sm font-bold border-b border-slate-900 bg-transparent focus:outline-none placeholder-slate-200 mb-3 py-1 resize-none overflow-hidden"
                placeholder="LOCAL E DATA"
                rows={1}
                value={footerLocationDate}
                onChange={(e) => setFooterLocationDate(e.target.value)}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
                disabled={isLocked}
              />
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Local e Data de Emissão</p>
            </div>
          </footer>
        </div>
      </div>

      <style>{`
        .word-canvas {
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .lined-textarea {
          background-image: linear-gradient(to bottom, #e2e8f0 1px, transparent 1px);
          background-size: 100% 32px;
          background-attachment: local;
        }
        .no-lined-bg {
          background-image: none !important;
        }
        textarea::placeholder, input::placeholder { color: #e2e8f0; }
        .page-break { page-break-inside: avoid; }
        .page-break-sheet { break-before: page; }
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          textarea, input { border: none !important; background-image: none !important; }
          .shadow-2xl, .shadow-lg, .shadow-md, .shadow-xl { box-shadow: none !important; }
          .word-canvas { box-shadow: none !important; margin: 0; padding: 20mm; }
          .page-break-sheet { break-before: page; margin-top: 0 !important; padding-top: 0 !important; border-top: none !important; }
        }
      `}</style>
    </div>
  );
};

export default App;
