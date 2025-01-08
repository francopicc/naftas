import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Settings, Check, Save, X } from "lucide-react";

const SettingsModal = ({ isOpen, onClose, onZoneChange }: { isOpen: boolean, onClose: () => void, onZoneChange: (zone: string) => void }) => {
    const [zona, setZona] = useState('este');
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
  
    useEffect(() => {
      const checkIfMobile = () => {
        setIsMobile(window.innerWidth < 768);
      };
      
      checkIfMobile();
      window.addEventListener('resize', checkIfMobile);
      
      return () => window.removeEventListener('resize', checkIfMobile);
    }, []);
  
    const handleSave = async () => {
      setIsSaving(true);
      onZoneChange(zona);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 1000);
    };
  
    const content = (
      <div className="space-y-6">
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zona de búsqueda
            </label>
            <motion.select
              value={zona}
              onChange={(e) => setZona(e.target.value)}
              className="w-full appearance-none bg-white px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-400 -ml-1 focus:outline-none transition-all cursor-pointer"
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <option value="" disabled>Selecciona una zona</option>
              <option value="norte">Norte</option>
              <option value="sur">Sur</option>
              <option value="este" selected>Este</option>
              <option value="oeste">Oeste</option>
            </motion.select>
            <div className="absolute right-4 top-1/2 -mt-3 -translate-y-1/2 pointer-events-none text-gray-500">
              <ChevronDown size={20} />
            </div>
            <span className="block text-xs text-stone-400 mb-3 mt-1">
              Los precios entre provincias o zonas de la Argentina, suelen variar entre un 5% o 10%, por lo que para obtener datos mas precisos es necesario especificarlo.
            </span>
          </div>
        </motion.div>
  
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={isSaving || showSuccess}
          className="w-full py-3 px-4 bg-stone-800 text-white rounded-lg font-medium flex items-center justify-center space-x-2 hover:bg-stone-900 transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Settings size={20} />
            </motion.div>
          ) : showSuccess ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
            >
              <Check size={20} />
            </motion.div>
          ) : (
            <>
              <Save size={20} />
              <span>Guardar cambios</span>
            </>
          )}
        </motion.button>
      </div>
    );
  
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
            {isMobile ? (
              // Bottom Sheet para móvil
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 500 }}
                className="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl p-6"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>
                  <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
                {content}
              </motion.div>
            ) : (
              // Modal centrado para desktop
              <div className="fixed inset-0 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ type: "spring", duration: 0.3 }}
                  className="bg-white rounded-xl p-6 w-[90%] max-w-md shadow-2xl"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                      <X size={20} className="text-gray-500" />
                    </button>
                  </div>
                  {content}
                </motion.div>
              </div>
            )}
          </>
        )}
      </AnimatePresence>
    );
  };

export default SettingsModal;