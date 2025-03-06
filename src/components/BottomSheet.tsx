import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Bookmark, AlertCircle } from "lucide-react";

interface Combustible {
  precio: number;
  fecha_vigencia: string;
}

const BottomSheet = ({ 
  isOpen, 
  onClose, 
  empresa, 
  combustible, 
  nombreCombustible,
  tipoCombustible,
  ciudad,
  onSuscribe,
  esSuscrito
}: {
  isOpen: boolean;
  onClose: () => void;
  empresa: string;
  combustible: Combustible;
  nombreCombustible: string;
  ciudad: string;
  tipoCombustible: string;
  onSuscribe?: (litros: number, total: number) => void;
  esSuscrito?: boolean;
}) => {
  const [localOpen, setLocalOpen] = useState(isOpen);
  const [litros, setLitros] = useState('');
  const [copiado, setCopiado] = useState(false);
  const total = parseFloat(litros) * combustible.precio || 0;
  const litrosInvalidos = litros !== '' && parseFloat(litros) <= 0;

  // Sincronizamos el estado local con la prop isOpen
  useEffect(() => {
    setLocalOpen(isOpen);
  }, [isOpen]);

  // Escucha para la tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Función para iniciar el cierre animado
  const handleClose = () => {
    setLocalOpen(false);
  };

  const copiarAlPortapapeles = () => {
    navigator.clipboard.writeText(total.toFixed(2));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const guardarSuscripcion = () => {
    if (onSuscribe && litros && parseFloat(litros) > 0) {
      onSuscribe(parseFloat(litros), total);
    }
  };

  return (
    <AnimatePresence onExitComplete={() => { if (!localOpen) onClose(); }}>
      {localOpen && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="fixed inset-0 bg-black"
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { ease: "easeInOut", duration: 0.35 } }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl p-6 space-y-6 md:w-1/2 md:mx-auto shadow-xl"
          >
            {/* Indicador de arrastre */}
            <motion.div
              className=""
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ type: "spring", stiffness: 150, damping: 20 }}
            />

            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                <img
                  src={`/assets/${
                    empresa.toLowerCase() === "shell c.a.p.s.a." ? "shell" : empresa.toLowerCase()
                  }.jpg`}
                  alt=""
                  className="h-12 w-12 object-cover"
                />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{empresa}</h2>
                <p className="text-gray-600">{tipoCombustible} - {ciudad}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Litros de carga
                </label>
                <input
                  type="number"
                  value={litros}
                  onChange={(e) => setLitros(e.target.value)}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg transition-all duration-200 
                    focus:outline-none focus:ring-2 ${litrosInvalidos ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-gray-700 focus:border-gray-700'}`}
                  placeholder="Ingrese cantidad de litros"
                />
                {litrosInvalidos && (
                  <div className="flex items-center mt-1 text-red-500 text-sm">
                    <AlertCircle size={14} className="mr-1" />
                    <span>Ingrese un valor mayor a 0</span>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Precio por litro:</span>
                  <span className="font-medium">${combustible.precio}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total a pagar:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">${total.toFixed(2)}</span>
                    <button
                      onClick={copiarAlPortapapeles}
                      className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                      title={copiado ? "¡Copiado!" : "Copiar al portapapeles"}
                    >
                      {copiado ? <Check size={20} className="text-gray-500" /> : <Copy size={20} className="text-gray-500" />}
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Última actualización: {new Date(combustible.fecha_vigencia).toLocaleDateString()}
                </div>
              </div>
              
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={guardarSuscripcion}
                className={`w-full flex items-center justify-center gap-2 
                  ${esSuscrito ? 'bg-white hover:bg-gray-100 text-black border border-gray-300' : 'bg-[#010101] hover:bg-black/60 text-white'}
                  py-3 px-4 rounded-lg font-medium transition-colors 
                  ${(!litros || parseFloat(litros) <= 0) ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={!litros || parseFloat(litros) <= 0}
              >
                {esSuscrito ? <Bookmark size={20} fill="black" /> : <Bookmark size={20} />}
                <span>{esSuscrito ? 'Cotización guardada' : 'Guardar cotización'}</span>
              </motion.button>
              {!litros && (
                <p className="text-center text-sm text-gray-500">Ingrese la cantidad de litros para guardar</p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BottomSheet;
