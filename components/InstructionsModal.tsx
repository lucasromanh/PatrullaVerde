
import React from 'react';

interface InstructionsModalProps {
  onClose: () => void;
}

const InstructionsModal: React.FC<InstructionsModalProps> = ({ onClose }) => {
  const rules = [
    { title: 'Animales 🐾', color: 'bg-purple-500', desc: '¡Encuentras un animal en peligro! Sumas un rescate al equipo.' },
    { title: 'Acción ⚡', color: 'bg-yellow-400', desc: 'Situaciones dinámicas: puedes avanzar, retroceder o ganar beneficios.' },
    { title: 'Amenaza ⚠️', color: 'bg-red-500', desc: '¡Peligro! Obstáculos ambientales que te retrasan o quitan rescates.' },
    { title: 'Solidaridad 🤝', color: 'bg-blue-500', desc: 'Ayuda a tus compañeros o gana turnos extra.' },
    { title: 'Residuos ♻️', color: 'bg-green-600', desc: 'Aprende sobre las 4R y el cuidado ambiental para avanzar.' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/80 backdrop-blur-md">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] border-8 border-emerald-100 overflow-hidden">
        <div className="bg-emerald-600 p-6 text-center">
            <h2 className="text-white text-3xl font-black italic tracking-tighter">MANUAL DEL GUARDIÁN</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            <p className="text-emerald-950 font-bold text-center mb-4 leading-snug">
                El objetivo es rescatar la mayor cantidad de animales posible antes de que todos lleguen a la salida.
            </p>
            
            {rules.map((rule, i) => (
                <div key={i} className="flex gap-4 items-center bg-emerald-50 p-4 rounded-3xl border-2 border-emerald-100">
                    <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl shadow-md ${rule.color}`}>
                        {rule.title.split(' ')[1]}
                    </div>
                    <div>
                        <h4 className="font-black text-emerald-900 text-sm">{rule.title.split(' ')[0]}</h4>
                        <p className="text-xs text-emerald-700 font-medium leading-tight">{rule.desc}</p>
                    </div>
                </div>
            ))}

            <div className="bg-yellow-50 p-6 rounded-3xl border-4 border-yellow-100 mt-4">
                <h4 className="font-black text-yellow-800 text-center mb-2 uppercase text-xs">Reglas de Oro</h4>
                <ul className="text-[11px] text-yellow-900 space-y-1 list-disc pl-4 font-bold">
                    <li>Juego cooperativo: ¡ayúdense entre sí!</li>
                    <li>Ganan si rescatan al menos 8 animales como equipo.</li>
                    <li>Sigue las instrucciones de cada tarjeta al pie de la letra.</li>
                </ul>
            </div>

            <div className="bg-emerald-900 p-6 rounded-3xl text-white mt-6 border-4 border-emerald-700 shadow-inner">
                <h4 className="font-black text-emerald-400 text-center mb-2 uppercase text-[10px] tracking-widest">Información del Desarrollador</h4>
                <div className="text-center space-y-1">
                    <p className="text-[10px] font-bold opacity-60 uppercase tracking-tighter mb-1">Software Developer</p>
                    <p className="text-2xl font-black italic uppercase tracking-tight">LUCAS ROMAN</p>
                    <p className="text-sm font-bold opacity-80 text-emerald-100">info@saltacoders.com</p>
                    <div className="pt-4 border-t border-white/10 mt-4">
                        <p className="text-[10px] font-medium uppercase tracking-[0.2em] opacity-60">Hecho con amor para</p>
                        <p className="text-lg font-black text-yellow-400 uppercase italic mt-1 leading-none">Celeste y Catalina</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="p-6 bg-emerald-50 border-t-4 border-emerald-100">
            <button 
                onClick={onClose}
                className="w-full py-4 bg-emerald-600 text-white font-black text-xl rounded-2xl shadow-[0_5px_0_#2E7D32]"
            >
                ¡ENTENDIDO!
            </button>
        </div>
      </div>
    </div>
  );
};

export default InstructionsModal;
