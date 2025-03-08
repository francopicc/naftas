import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Bookmark, AlertCircle, Fuel, Coins } from "lucide-react";
import Image from "next/image";

interface Combustible {
  precio: number;
  fecha_vigencia: string;
}

type CalcMode = "litros" | "precio";

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
  const [modoCalculo, setModoCalculo] = useState<CalcMode>("litros");
  const [litros, setLitros] = useState('');
  const [precio, setPrecio] = useState('');
  const [copiado, setCopiado] = useState(false);
  
  // Cálculos según el modo
  const total = modoCalculo === "litros" 
    ? parseFloat(litros) * combustible.precio || 0
    : parseFloat(precio) || 0;
    
  const litrosCalculados = modoCalculo === "precio" 
    ? parseFloat(precio) / combustible.precio || 0
    : parseFloat(litros) || 0;
    
  const inputInvalido = modoCalculo === "litros" 
    ? litros !== '' && parseFloat(litros) <= 0
    : precio !== '' && parseFloat(precio) <= 0;

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
    // Copiamos el valor relevante según el modo
    if (modoCalculo === "litros") {
      navigator.clipboard.writeText(total.toFixed(2));
    } else {
      navigator.clipboard.writeText(litrosCalculados.toFixed(2));
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const guardarSuscripcion = () => {
    if (onSuscribe) {
      if (modoCalculo === "litros" && litros && parseFloat(litros) > 0) {
        onSuscribe(parseFloat(litros), total);
      } else if (modoCalculo === "precio" && precio && parseFloat(precio) > 0) {
        onSuscribe(litrosCalculados, parseFloat(precio));
      }
    }
  };

  const inputValido = modoCalculo === "litros" 
    ? litros && parseFloat(litros) > 0
    : precio && parseFloat(precio) > 0;

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
            {/* Cabecera con logo e información */}
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                <Image
                  src={`/assets/${
                    empresa.toLowerCase() === "shell c.a.p.s.a." ? "shell" : empresa.toLowerCase()
                  }.jpg`}
                  alt=""
                  className="h-12 w-12 object-cover"
                  width={64}
                  height={64}
                />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{empresa}</h2>
                <p className="text-gray-600">{tipoCombustible} - {ciudad}</p>
              </div>
            </div>

            {/* Selector de modo */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setModoCalculo("litros")}
                className={`flex items-center justify-center gap-2 flex-1 py-2 px-3 rounded-lg transition-colors ${
                  modoCalculo === "litros" ? "bg-white shadow-sm" : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Fuel size={18} />
                <span className="text-sm font-medium">Por litros</span>
              </button>
              <button
                onClick={() => setModoCalculo("precio")}
                className={`flex items-center justify-center gap-2 flex-1 py-2 px-3 rounded-lg transition-colors ${
                  modoCalculo === "precio" ? "bg-white shadow-sm" : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Coins size={18} />
                <span className="text-sm font-medium">Por precio</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Campo de entrada según el modo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {modoCalculo === "litros" ? "Litros de carga" : "Presupuesto ($ARS)"}
                </label>
                <input
                  type="number"
                  value={modoCalculo === "litros" ? litros : precio}
                  onChange={(e) => {
                    modoCalculo === "litros" ? setLitros(e.target.value) : setPrecio(e.target.value);
                  }}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg transition-all duration-200 
                    focus:outline-none focus:ring-2 ${inputInvalido ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-gray-700 focus:border-gray-700'}`}
                  placeholder={modoCalculo === "litros" ? "Ingrese cantidad de litros" : "Ingrese monto en pesos"}
                />
                {inputInvalido && (
                  <div className="flex items-center mt-1 text-red-500 text-sm">
                    <AlertCircle size={14} className="mr-1" />
                    <span>Ingrese un valor mayor a 0</span>
                  </div>
                )}
              </div>

              {/* Información de cálculos */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Precio por litro:</span>
                  <span className="font-medium">${combustible.precio}</span>
                </div>
                
                {modoCalculo === "litros" ? (
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
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Litros a cargar:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold">{litrosCalculados.toFixed(2)} L</span>
                      <button
                        onClick={copiarAlPortapapeles}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                        title={copiado ? "¡Copiado!" : "Copiar al portapapeles"}
                      >
                        {copiado ? <Check size={20} className="text-gray-500" /> : <Copy size={20} className="text-gray-500" />}
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-gray-500 mt-2">
                  Última actualización: {new Date(combustible.fecha_vigencia).toLocaleDateString()}
                </div>
              </div>
              
              {/* Botón de acción */}
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={guardarSuscripcion}
                className={`w-full flex items-center justify-center gap-2 
                  ${esSuscrito ? 'bg-white hover:bg-gray-100 text-black border border-gray-300' : 'bg-[#010101] hover:bg-black/60 text-white'}
                  py-3 px-4 rounded-lg font-medium transition-colors 
                  ${!inputValido ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={!inputValido}
              >
                {esSuscrito ? <Bookmark size={20} fill="black" /> : <Bookmark size={20} />}
                <span>{esSuscrito ? 'Cotización guardada' : 'Guardar cotización'}</span>
              </motion.button>
              
              {!inputValido && (
                <p className="text-center text-sm text-gray-500">
                  {modoCalculo === "litros" 
                    ? "Ingrese la cantidad de litros para guardar" 
                    : "Ingrese el monto para guardar"}
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BottomSheet;