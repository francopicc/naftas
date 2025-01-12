import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy } from "lucide-react";

interface Coordenadas {
  latitud: number;
  longitud: number;
}

interface Combustible {
  precio: number;
  fecha_vigencia: string;
}

interface EmpresaCombustibles {
  [nombreCombustible: string]: Combustible;
}

interface Empresas {
  [nombreEmpresa: string]: EmpresaCombustibles;
}

interface Ciudad {
  coordenadas: Coordenadas;
  empresas: Empresas;
}

interface ApiResponse {
  [ciudad: string]: Ciudad;
}

const getNombreCombustible = (combustible: string, empresa: string): string => {
  return combustible; // La API ya provee los nombres correctos
};

const BottomSheet = ({ 
  isOpen, 
  onClose, 
  empresa, 
  combustible, 
  nombreCombustible,
  tipoCombustible,
  ciudad
}: {
  isOpen: boolean;
  onClose: () => void;
  empresa: string;
  combustible: Combustible;
  nombreCombustible: string;
  ciudad: string;
  tipoCombustible: string;
}) => {
  const [litros, setLitros] = useState('');
  const [copiado, setCopiado] = useState(false);
  const total = parseFloat(litros) * combustible.precio || 0;

  const copiarAlPortapapeles = () => {
    navigator.clipboard.writeText(total.toFixed(2));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 500 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl p-6 space-y-6 md:w-1/2 md:mx-auto"
          >
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ingrese cantidad de litros"
                />
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BottomSheet;