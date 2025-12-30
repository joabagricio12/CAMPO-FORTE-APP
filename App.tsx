
import React, { useState, useEffect, useRef } from 'react';
import { WegMotorData } from './types';
import { WEG_MOTORS, getMotorByCv } from './motorData';
import { calculateDimensioning, calculateGeneralSummary } from './calculations';

interface PageData {
  id: string;
  type: 'report' | 'extra' | 'materials';
  title: string;
  content: any[]; // Para report/extra
  text: string;   // Para materials/extra text
}

const MotorImg = () => (
  <svg width="50" height="50" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="50" y="70" width="100" height="80" rx="2" fill="#334155" />
    <rect x="35" y="85" width="15" height="50" fill="#334155" />
    <rect x="150" y="85" width="10" height="50" fill="#334155" />
    <rect x="160" y="100" width="25" height="20" fill="#334155" />
    <path d="M80 70V55H120V70" stroke="#334155" strokeWidth="6" strokeLinecap="round"/>
    <rect x="85" y="110" width="30" height="10" fill="#cbd5e1" opacity="0.3" />
  </svg>
);

const App: React.FC = () => {
  const [pages, setPages] = useState<PageData[]>([
    { id: 'p1', type: 'report', title: 'LAUDO TÉCNICO', content: [{ id: 't1', type: 'text', value: '' }], text: '' }
  ]);
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const currentDate = new Date().toLocaleDateString('pt-BR');

  useEffect(() => {
    const saved = localStorage.getItem('campo-forte-v4');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.pages) setPages(parsed.pages);
      if (parsed.headerImage) setHeaderImage(parsed.headerImage);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('campo-forte-v4', JSON.stringify({ pages, headerImage }));
  }, [pages, headerImage]);

  // Ações de Página
  const addExtraPage = () => {
    const newPage: PageData = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'extra',
      title: 'ANEXO TÉCNICO',
      content: [],
      text: ''
    };
    setPages([...pages, newPage]);
  };

  const addMaterialsPage = () => {
    const newPage: PageData = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'materials',
      title: 'LISTA DE MATERIAIS',
      content: [],
      text: ''
    };
    setPages([...pages, newPage]);
  };

  const removePage = (id: string) => {
    if (pages.length <= 1) return;
    setPages(pages.filter(p => p.id !== id));
  };

  // Itens dentro das páginas
  const addItemToPage = (pageId: string, type: 'text' | 'motor' | 'summary') => {
    setPages(pages.map(p => {
      if (p.id === pageId) {
        const newItem = { id: Math.random().toString(36).substr(2, 9), type, value: type === 'motor' ? '1' : '' };
        return { ...p, content: [...p.content, newItem] };
      }
      return p;
    }));
  };

  const updateItem = (pageId: string, itemId: string, value: string) => {
    setPages(pages.map(p => {
      if (p.id === pageId) {
        return { ...p, content: p.content.map(i => i.id === itemId ? { ...i, value } : i) };
      }
      return p;
    }));
  };

  const removeItem = (pageId: string, itemId: string) => {
    setPages(pages.map(p => {
      if (p.id === pageId) {
        return { ...p, content: p.content.filter(i => i.id !== itemId) };
      }
      return p;
    }));
  };

  const updatePageTitle = (id: string, title: string) => {
    setPages(pages.map(p => p.id === id ? { ...p, title } : p));
  };

  const updatePageText = (id: string, text: string) => {
    setPages(pages.map(p => p.id === id ? { ...p, text } : p));
  };

  const handleHeaderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setHeaderImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const downloadAllPDF = async () => {
    if (!reportRef.current) return;
    const { jsPDF } = (window as any).jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    for (let i = 0; i < pages.length; i++) {
      const element = document.getElementById(`page-${pages[i].id}`);
      if (element) {
        const canvas = await (window as any).html2canvas(element, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }
    }
    pdf.save(`CAMPO_FORTE_PROJETO_COMPLETO.pdf`);
  };

  const downloadSinglePage = async (pageId: string) => {
    const element = document.getElementById(`page-${pageId}`);
    if (!element) return;
    const canvas = await (window as any).html2canvas(element, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = (window as any).jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`CAMPO_FORTE_PAGINA.pdf`);
  };

  const PageLogo = () => (
    <div className="flex justify-center w-full absolute top-[8mm] left-0 px-[20mm] z-50">
      {headerImage ? (
        <img src={headerImage} alt="Logo" className="max-h-[22mm] object-contain cursor-pointer" onClick={() => !isLocked && document.getElementById('logo-trigger')?.click()} />
      ) : (
        <div className="w-full h-12 border border-dashed border-slate-200 flex items-center justify-center text-[8px] text-slate-400 font-bold cursor-pointer no-print" onClick={() => document.getElementById('logo-trigger')?.click()}>CLIQUE PARA LOGOTIPO</div>
      )}
      <input id="logo-trigger" type="file" className="hidden" onChange={handleHeaderUpload} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-300 pb-20 font-sans">
      {/* MENU SUPERIOR FIXO */}
      <nav className="sticky top-0 z-[100] bg-slate-900 px-4 py-2 no-print flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-white text-slate-900 px-2 py-0.5 rounded font-black text-xs">CAMPO FORTE</div>
          <div className="h-4 w-px bg-slate-700 mx-1"></div>
          <button onClick={addExtraPage} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase transition">+ PÁGINA</button>
          <button onClick={addMaterialsPage} className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase transition">+ LISTA</button>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={() => setIsLocked(!isLocked)} className={`px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase transition ${isLocked ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-900'}`}>
            {isLocked ? 'MODO PDF' : 'EDITAR'}
          </button>
          <button onClick={downloadAllPDF} className="bg-white text-slate-900 px-5 py-1.5 rounded-sm text-[10px] font-bold uppercase transition font-black">BAIXAR PROJETO</button>
        </div>
      </nav>

      <div ref={reportRef} className="max-w-[210mm] mx-auto mt-6 flex flex-col gap-6">
        {pages.map((page, pIdx) => (
          <div 
            id={`page-${page.id}`} 
            key={page.id} 
            className="bg-white min-h-[297mm] p-[20mm] pt-[40mm] relative flex flex-col shadow-2xl overflow-hidden" 
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            <PageLogo />

            {/* AÇÕES DA PÁGINA (SÓ UI) */}
            {!isLocked && (
              <div className="absolute top-4 right-4 flex gap-2 no-print">
                <button onClick={() => downloadSinglePage(page.id)} className="bg-blue-50 text-blue-600 px-3 py-1 rounded text-[9px] font-bold border border-blue-100 hover:bg-blue-100 transition">BAIXAR ESTA PÁGINA</button>
                {pIdx > 0 && (
                  <button onClick={() => removePage(page.id)} className="bg-red-50 text-red-600 px-3 py-1 rounded text-[9px] font-bold border border-red-100 hover:bg-red-100 transition">REMOVER</button>
                )}
              </div>
            )}

            {/* TÍTULO DA PÁGINA */}
            <header className="mb-8 w-full flex flex-col items-center">
              <textarea 
                className="w-full text-center text-4xl font-bold uppercase bg-transparent border-none focus:outline-none placeholder-slate-100 resize-none overflow-hidden" 
                rows={1}
                value={page.title} 
                onChange={(e) => updatePageTitle(page.id, e.target.value)} 
                disabled={isLocked}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
              />
              <div className="w-1/4 h-1 bg-slate-900 mt-2"></div>
            </header>

            {/* CONTEÚDO DA PÁGINA */}
            <div className="flex flex-col flex-1 gap-4">
              
              {/* BOTÕES DE ADIÇÃO DENTRO DA PÁGINA (SÓ UI) */}
              {page.type !== 'materials' && !isLocked && (
                <div className="flex gap-2 mb-4 no-print border-b border-slate-50 pb-2">
                  <button onClick={() => addItemToPage(page.id, 'text')} className="text-[9px] font-bold bg-slate-100 px-2 py-1 rounded hover:bg-slate-200">+ BLOCO TEXTO</button>
                  <button onClick={() => addItemToPage(page.id, 'motor')} className="text-[9px] font-bold bg-slate-100 px-2 py-1 rounded hover:bg-slate-200">+ MOTOR</button>
                  <button onClick={() => addItemToPage(page.id, 'summary')} className="text-[9px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">+ RESUMO DIMENS.</button>
                </div>
              )}

              {page.type === 'materials' ? (
                <textarea 
                  className="w-full flex-1 text-2xl leading-[1.8] bg-white resize-none focus:outline-none placeholder-slate-100 py-4 border-none overflow-hidden"
                  placeholder="Relacione os materiais aqui..."
                  value={page.text}
                  onChange={(e) => updatePageText(page.id, e.target.value)}
                  disabled={isLocked}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                />
              ) : (
                page.content.map((item) => {
                  if (item.type === 'text') {
                    return (
                      <div key={item.id} className="relative group">
                        <textarea 
                          className="w-full text-xl leading-[1.6] text-justify bg-white resize-none focus:outline-none placeholder-slate-100 p-0 border-none overflow-hidden" 
                          placeholder="Digite aqui..." 
                          rows={1} 
                          value={item.value} 
                          onChange={(e) => updateItem(page.id, item.id, e.target.value)} 
                          disabled={isLocked} 
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = target.scrollHeight + 'px';
                          }} 
                        />
                        {!isLocked && <button onClick={() => removeItem(page.id, item.id)} className="absolute -left-10 top-0 opacity-0 group-hover:opacity-100 text-red-400 no-print text-2xl">×</button>}
                      </div>
                    );
                  } else if (item.type === 'motor') {
                    return (
                      <div key={item.id} className="relative group w-full flex justify-start my-2">
                        {!isLocked && <button onClick={() => removeItem(page.id, item.id)} className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-400 no-print text-2xl">×</button>}
                        <div className="flex items-center gap-6 p-4 border border-slate-100 bg-slate-50 rounded-sm w-fit min-w-[320px]">
                          <MotorImg />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Equipamento</span>
                            {!isLocked ? (
                              <select className="text-2xl font-black bg-transparent border-none focus:outline-none cursor-pointer" value={item.value} onChange={(e) => updateItem(page.id, item.id, e.target.value)}>
                                {WEG_MOTORS.map(m => <option key={m.cv} value={m.cv}>{m.cv} CV - Trifásico</option>)}
                              </select>
                            ) : (
                              <span className="text-2xl font-black">{item.value} CV - Trifásico</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  } else if (item.type === 'summary') {
                    // Coleta todos os motores de TODAS as páginas para o resumo (ou só desta página?)
                    // Geralmente o resumo é do projeto todo. Vamos filtrar motores de todas as páginas:
                    const allMotors = pages.flatMap(p => p.content)
                      .filter(i => i.type === 'motor')
                      .map(i => getMotorByCv(parseFloat(i.value)))
                      .filter((m): m is WegMotorData => !!m);
                    const summary = calculateGeneralSummary(allMotors);

                    return (
                      <div key={item.id} className="relative group w-full my-6">
                        {!isLocked && <button onClick={() => removeItem(page.id, item.id)} className="absolute -left-10 top-0 opacity-0 group-hover:opacity-100 text-red-400 no-print text-2xl">×</button>}
                        <div className="border-t-4 border-b-4 border-slate-900 py-8 px-4 flex flex-col gap-6">
                          <h3 className="text-2xl font-bold uppercase tracking-widest border-b border-slate-100 pb-2">Quadro de Dimensionamento ({summary.motorCount} Motores)</h3>
                          <div className="flex flex-col gap-3">
                            {allMotors.map((m, idx) => {
                              const dim = calculateDimensioning(m);
                              return (
                                <div key={idx} className="grid grid-cols-5 gap-2 text-center border-b border-slate-50 pb-2">
                                  <div className="flex flex-col items-start"><span className="text-[8px] font-bold text-slate-400">Potência</span><span className="text-sm font-bold">{m.cv} CV</span></div>
                                  <div className="flex flex-col"><span className="text-[8px] font-bold text-slate-400">In (A)</span><span className="text-sm font-bold">{m.currentIn} A</span></div>
                                  <div className="flex flex-col"><span className="text-[8px] font-bold text-slate-400">Disjuntor</span><span className="text-sm font-bold">{dim.circuitBreaker}</span></div>
                                  <div className="flex flex-col"><span className="text-[8px] font-bold text-slate-400">Cabo</span><span className="text-sm font-bold text-blue-700">{dim.cableSize}</span></div>
                                  <div className="flex flex-col"><span className="text-[8px] font-bold text-slate-400">Partida</span><span className="text-sm font-bold">{dim.softStarter || dim.contactor}</span></div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-900 text-sm font-bold">
                            <div className="flex justify-between uppercase"><span>Potência Total:</span><span>{summary.totalCv} CV</span></div>
                            <div className="flex justify-between uppercase text-blue-700"><span>Proteção Geral:</span><span>{summary.recommendedMainBreaker}</span></div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })
              )}
            </div>

            <footer className="mt-auto pt-6 text-right italic text-slate-400 text-sm">
              Emitido em: {currentDate} | CAMPO FORTE ENGENHARIA
            </footer>
          </div>
        ))}
      </div>

      <style>{`
        textarea::placeholder { color: #f1f5f9; }
        @media print {
          body { background: white !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .shadow-2xl { box-shadow: none !important; }
          .mt-6 { margin-top: 0 !important; }
          .bg-slate-300 { background: white !important; }
        }
      `}</style>
    </div>
  );
};

export default App;
