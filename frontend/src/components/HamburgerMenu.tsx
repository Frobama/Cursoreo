import React, { useState, useEffect, useRef } from 'react';
// import styles from './HamburgerMenu.module.css';

const HamburgerMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onClick);
    };
  }, []);

  const go = (hash: string) => {
    window.location.hash = hash;
    setOpen(false);
  };

  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  })();

  const initials = user && user.email ? String(user.email).charAt(0).toUpperCase() : 'U';

  return (
    <div className="fixed left-4 top-4 z-[120]" ref={ref}>
      <button
        className="w-12 h-12 flex items-center justify-center rounded-lg bg-white shadow-md border border-slate-100"
        onClick={() => setOpen(s => !s)}
        aria-label="Abrir menú"
      >
        <svg width="22" height="14" viewBox="0 0 22 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="22" height="2" rx="1" fill="#0c90dc" />
          <rect y="6" width="22" height="2" rx="1" fill="#0c90dc" />
          <rect y="12" width="22" height="2" rx="1" fill="#0c90dc" />
        </svg>
      </button>

      {open && <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />}

      {open && (
        <aside className="fixed left-0 top-0 h-full w-72 max-w-[90vw] bg-gradient-to-b from-[var(--primary)] to-white p-5 shadow-lg z-50 text-slate-900" role="dialog" aria-label="Menú lateral">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 pb-4 border-b border-white/30">
              <div className="w-14 h-14 rounded-lg bg-white flex items-center justify-center text-primary font-bold text-xl shadow-sm">{initials}</div>
              <div className="flex flex-col">
                <div className="text-slate-900 font-semibold">{user?.carreras?.[0]?.nombre ?? user?.email ?? 'Usuario'}</div>
                <div className="text-sm text-slate-700">{user?.rut ?? ''}</div>
              </div>
              <button className="ml-auto text-white/90" onClick={() => setOpen(false)} aria-label="Cerrar">✕</button>
            </div>

            <nav className="mt-6 flex flex-col gap-3">
              <button onClick={() => go('#mis-proyecciones')} className="text-left bg-white/90 hover:bg-white transition px-3 py-2 rounded-md shadow-sm">
                <div className="font-semibold text-slate-900">★ Mis Proyecciones</div>
                <div className="text-sm text-slate-600">Ver y administrar</div>
              </button>

              <button onClick={() => go('#guardar-manual')} className="text-left bg-white/90 hover:bg-white transition px-3 py-2 rounded-md shadow-sm">
                <div className="font-semibold text-slate-900">💾 Guardar Proyección Manual</div>
                <div className="text-sm text-slate-600">Guardar el plan actual</div>
              </button>

              <button onClick={() => go('#proyeccion-egreso')} className="text-left bg-white/90 hover:bg-white transition px-3 py-2 rounded-md shadow-sm">
                <div className="font-semibold text-slate-900">📈 Plan de Egreso</div>
                <div className="text-sm text-slate-600">Generar y guardar</div>
              </button>

              <button onClick={() => go('#home')} className="text-left bg-white/90 hover:bg-white transition px-3 py-2 rounded-md shadow-sm">
                <div className="font-semibold text-slate-900">🏠 Inicio</div>
                <div className="text-sm text-slate-600">Volver al inicio</div>
              </button>
            </nav>

            <div className="mt-auto flex flex-col gap-2">
              <button onClick={() => { window.location.hash = '#mis-proyecciones'; setOpen(false); }} className="w-full bg-white text-primary font-medium py-2 rounded-md shadow hover:opacity-95">Ir a Mis Proyecciones</button>
              <button onClick={() => { window.location.hash = '#home'; setOpen(false); }} className="w-full bg-white/80 text-slate-800 py-2 rounded-md shadow hover:opacity-95">Cerrar menú</button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};

export default HamburgerMenu;
