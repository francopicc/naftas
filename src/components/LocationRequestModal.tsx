import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Loader2 } from 'lucide-react';
import axios from "axios";

interface LocationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSet: (zone: string) => void;
  onLoading: (isLoading: boolean) => void;
}

const LocationRequestModal = ({ isOpen, onClose, onLocationSet, onLoading }: LocationRequestModalProps) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedCity, setSuggestedCity] = useState<string | null>(null);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const handleLocationRequest = async () => {
    setIsLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { latitude, longitude } = position.coords;
      const response = await axios.get(`/api/location?lat=${latitude}&long=${longitude}`);
      setSuggestedCity(response.data.zone);
    } catch (error) {
      console.error('Error getting location:', error);
      setSuggestedCity('CAPITAL FEDERAL');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleLocationRequest(); // Llama a la función de solicitud de ubicación al abrir el modal
    }
  }, [isOpen]);

  const handleConfirmCity = () => {
    if (suggestedCity) {
      onLoading(true); // Activar loading antes de cerrar el modal
      onLocationSet(suggestedCity);
      localStorage.setItem('userCity', suggestedCity);
      onClose();
    }
  };

  const handleRejectCity = () => {
    setSuggestedCity(null);
  };

  const handleSkip = () => {
    onLoading(true); // Activar loading antes de cerrar el modal
    onLocationSet('CAPITAL FEDERAL');
    localStorage.setItem('userCity', 'CAPITAL FEDERAL');
    onClose();
  };

  const modalContent = (
    <div className="space-y-6">
      {!suggestedCity ? (
        <>
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <MapPin size={24} className="text-blue-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Permitir acceso a la ubicación
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Para mostrarte los precios más precisos, necesitamos acceder a tu ubicación.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLocationRequest}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center space-x-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin size={20} />}
            <span>{isLoading ? "Obteniendo ubicación..." : "Permitir acceso"}</span>
          </motion.button>
        </>
      ) : (
        <>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¿Es esta tu ciudad?
            </h3>
            <p className="text-xl font-bold text-blue-600 mb-6">
              {suggestedCity}
            </p>
          </div>

          <div className="flex space-x-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleConfirmCity}
              className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Sí, es correcta
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRejectCity}
              className="flex-1 py-3 px-4 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              No, elegir otra
            </motion.button>
          </div>
        </>
      )}

      <button
        onClick={handleSkip}
        className="w-full py-3 px-4 text-gray-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
      >
        Más tarde
      </button>
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
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 500 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Ubicación</h2>
                <button onClick={handleSkip} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              {modalContent}
            </motion.div>
          ) : (
            <div className="fixed inset-0 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="bg-white rounded-xl p-6 w-[90%] max-w-md shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Ubicación</h2>
                  <button onClick={handleSkip} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
                {modalContent}
              </motion.div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
};

export default LocationRequestModal;