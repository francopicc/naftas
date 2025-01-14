import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Settings, Check, Save, X, MapPin, Loader2, Search } from "lucide-react";
import axios from "axios";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onZoneChange: (zone: string) => void;
  onData: (data: any) => void;
}

const SettingsModal = ({ isOpen, onClose, onZoneChange, onData}: SettingsModalProps) => {
  const [zona, setZona] = useState('este');
  const [cityInput, setCityInput] = useState('');
  const [suggestedCity, setSuggestedCity] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showCityConfirmation, setShowCityConfirmation] = useState(false);
  
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  useEffect(() => {
    // Sincronizar el estado inicial con localStorage
    const storedCity = localStorage.getItem('userCity');
    console.log(storedCity)
    if (storedCity) {
      setZona(storedCity);
    }
    }, []);

    const fetchDataForCity = async (city: string) => {
      try {
        const response = await axios.get(`/api/precio-base?ciudad=${city.toUpperCase()}`);
        if (response.data) {
          onData(response.data);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error fetching data:', error);
        return false;
      }
    };
    
    const updateUserCity = (city: string) => {
      localStorage.setItem('userCity', city);
      onZoneChange(city);
    };
    

  const handleLocationRequest = async () => {
    setIsLoadingLocation(true);
    setLocationError(null);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          maximumAge: 0,
          enableHighAccuracy: true
        });
      });

      const { latitude, longitude } = position.coords;
      const response = await axios.get(`/api/location?lat=${latitude}&long=${longitude}`);
      
      if (response.data.zone) {
        const success = await fetchDataForCity(response.data.zone);
        if (success) {
          setSuggestedCity(response.data.zone);
          setShowCityConfirmation(true);
        } else {
          throw new Error('No se pudieron obtener los datos de la zona');
        }
      } else {
        throw new Error('No se pudo determinar la zona');
      }
    } catch (error) {
      let errorMessage = 'Error al obtener la ubicación';
      
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Acceso a la ubicación denegado';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Ubicación no disponible';
            break;
          case error.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado';
            break;
        }
      } else if (axios.isAxiosError(error)) {
        errorMessage = 'Error al conectar con el servidor';
      }
      
      setLocationError(errorMessage);
      console.error('Error de ubicación:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleConfirmCity = async () => {
    if (suggestedCity) {
      setIsSaving(true);
      try {
        const success = await fetchDataForCity(suggestedCity);
        if (success) {
          updateUserCity(suggestedCity);
          setZona(suggestedCity);
          setShowCityConfirmation(false);
          setCityInput('');
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            onClose();
          }, 1000);
        } else {
          setLocationError('Error al obtener datos de la ciudad');
        }
      } catch (error) {
        console.error('Error al confirmar ciudad:', error);
        setLocationError('Error al guardar la configuración');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleRejectCity = () => {
    setSuggestedCity(null);
    setShowCityConfirmation(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await fetchDataForCity(zona);
      if (success) {
        updateUserCity(zona);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          onClose();
        }, 1000);
      } else {
        setLocationError('Error al obtener datos de la zona');
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      setLocationError('Error al guardar los cambios');
    } finally {
      setIsSaving(false);
    }
  };

  const cityConfirmationContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          ¿Confirmas esta ubicación?
        </h3>
        <p className="text-xl font-bold text-stone-800 mb-6">
          {suggestedCity}
        </p>
      </div>

      <div className="flex space-x-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleConfirmCity}
          className="flex-1 py-3 px-4 bg-stone-800 text-white rounded-lg font-medium hover:bg-stone-900 transition-colors"
        >
          Confirmar
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRejectCity}
          className="flex-1 py-3 px-4 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
        >
          Cancelar
        </motion.button>
      </div>
    </motion.div>
  );

  const mainContent = (
    <div className="space-y-6">
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="relative space-y-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ubicación
          </label>
          
          <div className="space-y-3">

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLocationRequest}
              disabled={isLoadingLocation}
              className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium flex items-center justify-center space-x-2 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {isLoadingLocation ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MapPin size={20} className="mr-2" />
              )}
              <span>
                {isLoadingLocation ? "Detectando ubicación..." : "Usar mi ubicación actual"}
              </span>
            </motion.button>
          </div>

          {locationError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-600 mt-2"
            >
              {locationError}
            </motion.div>
          )}
          
          <span className="block text-xs text-stone-400">
            Los precios entre provincias o zonas de la Argentina, suelen variar entre un 5% o 10%, por lo que para obtener datos más precisos es necesario especificarlo.
          </span>
        </div>
      </motion.div>
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
                <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              {showCityConfirmation ? cityConfirmationContent : mainContent}
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
                  <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>
                  <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
                {showCityConfirmation ? cityConfirmationContent : mainContent}
              </motion.div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;