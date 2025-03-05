"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Check, X, MapPin, Loader2, Search, ArrowLeft } from "lucide-react"
import axios from "axios"
import { NextResponse } from "next/server"
import { calculateDistance } from "@/utils/calculateDistance"

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onZoneChange: (zone: string) => void
  onData: (data: any) => void
}

interface City {
  nombre: string
  latitud: number
  longitud: number
}

const SettingsModal = ({ isOpen, onClose, onZoneChange, onData }: SettingsModalProps) => {
  const [zona, setZona] = useState("este")
  const [cityInput, setCityInput] = useState("")
  const [suggestedCity, setSuggestedCity] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [isSearchingCity, setIsSearchingCity] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [showCityConfirmation, setShowCityConfirmation] = useState(false)
  const [showManualSearch, setShowManualSearch] = useState(false)
  const [searchResults, setSearchResults] = useState<City[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkIfMobile()
    window.addEventListener("resize", checkIfMobile)

    return () => window.removeEventListener("resize", checkIfMobile)
  }, [])

  useEffect(() => {
    // Sincronizar el estado inicial con localStorage
    const storedCity = localStorage.getItem("userCity")
    console.log(storedCity)
    if (storedCity) {
      setZona(storedCity)
    }
  }, [])

  useEffect(() => {
    // Enfocar el input cuando se muestra la búsqueda manual
    if (showManualSearch && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showManualSearch])

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCityInput(value)

    // Limpiar el timeout anterior si existe
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Limpiar resultados si el input está vacío
    if (value.length < 3) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    // Configurar nuevo timeout para la búsqueda
    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(() => {
      searchCities(value)
    }, 500) // Reducido a 500ms para mejor experiencia
  }

  const searchCities = async (query: string) => {
    if (query.length < 3) return

    try {
      const response = await axios.get(`/api/search?q=${query}`)
      // Validate and filter out invalid city data
      const validCities = (response.data.cities || [])
        .filter((city: any): city is City => city && typeof city === "object" && city.nombre)
        .slice(0, 3)
      setSearchResults(validCities)
    } catch (error) {
      console.error("Error buscando ciudades:", error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const fetchDataForCity = async (city: string) => {
    try {
      const response = await axios.get(`/api/precio-base?ciudad=${city.toUpperCase()}`)
      if (response.data) {
        onData(response.data)
        return true
      }
      return false
    } catch (error) {
      console.error("Error fetching data:", error)
      return false
    }
  }

  const updateUserCity = (city: string) => {
    localStorage.setItem("userCity", city)
    onZoneChange(city)
  }

  const handleLocationRequest = async () => {
    setIsLoadingLocation(true)
    setLocationError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          maximumAge: 0,
          enableHighAccuracy: true,
        })
      })

      const { latitude, longitude } = position.coords
      const response = await axios.get(`/api/location?lat=${latitude}&long=${longitude}`)

      if (response.data.zone) {
        setSuggestedCity(response.data.zone)
        setShowCityConfirmation(true)
      } else {
        throw new Error("No se pudo determinar la zona")
      }
    } catch (error) {
      let errorMessage = "Error al obtener la ubicación"

      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Acceso a la ubicación denegado"
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Ubicación no disponible"
            break
          case error.TIMEOUT:
            errorMessage = "Tiempo de espera agotado"
            break
        }
      } else if (axios.isAxiosError(error)) {
        errorMessage = "Error al conectar con el servidor"
      }

      setLocationError(errorMessage)
      console.error("Error de ubicación:", error)
    } finally {
      setIsLoadingLocation(false)
    }
  }

  const handleConfirmCity = async (city: string = suggestedCity || "") => {
    if (city) {
      setIsSaving(true)
      try {
        const success = await fetchDataForCity(city)
        if (success) {
          updateUserCity(city)
          setZona(city)
          setShowCityConfirmation(false)
          setShowManualSearch(false)
          setCityInput("")
          setShowSuccess(true)
          setTimeout(() => {
            setShowSuccess(false)
            onClose()
          }, 1000)
        } else {
          setLocationError("Error al obtener datos de la ciudad")
        }
      } catch (error) {
        console.error("Error al confirmar ciudad:", error)
        setLocationError("Error al guardar la configuración")
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleRejectCity = () => {
    setShowCityConfirmation(false)
  }

  const handleShowManualSearch = () => {
    setShowManualSearch(true)
    setLocationError(null)
  }

  const handleBackToMain = () => {
    setShowManualSearch(false)
    setCityInput("")
    setSearchResults([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (showManualSearch) {
        handleBackToMain()
      } else {
        onClose()
      }
    }
  }

  const cityConfirmationContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">¿Confirmas esta ubicación?</h3>
        <p className="text-xl font-bold text-stone-800 mb-6">{suggestedCity}</p>
      </div>

      <div className="flex space-x-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleConfirmCity()}
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
  )

  const manualSearchContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-6"
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center mb-4">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleBackToMain}
          className="p-2 mr-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft size={20} className="text-gray-500" />
        </motion.button>
        <h3 className="text-lg font-semibold text-gray-900">Buscar ubicación</h3>
      </div>

      {/* Search results for mobile - positioned ABOVE the input */}
      {isMobile && searchResults.length > 0 && (
        <motion.ul
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-white border border-gray-300 rounded-lg mb-3 shadow-lg overflow-hidden"
        >
          {searchResults.map((city, index) => (
            <motion.li
              key={index}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={index !== searchResults.length - 1 ? "border-b border-gray-100" : ""}
            >
              <button
                onClick={() => handleConfirmCity(city.nombre)}
                className="w-full text-left py-4 px-4 hover:bg-gray-50 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-stone-100 p-2 rounded-full">
                    <MapPin size={18} className="text-stone-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-stone-800 group-hover:text-stone-900">
                      {city.nombre || "Ciudad"}
                    </span>
                    <span className="text-xs text-gray-500 mt-0.5">
                      {typeof city.latitud === "number" ? `${city.latitud.toFixed(2)}°` : ""}
                      {typeof city.latitud === "number" && typeof city.longitud === "number" ? ", " : ""}
                      {typeof city.longitud === "number" ? `${city.longitud.toFixed(2)}°` : ""}
                    </span>
                  </div>
                </div>
                <motion.div whileHover={{ x: 3 }} className="text-stone-500 group-hover:text-stone-700">
                  <ChevronDown size={18} className="transform -rotate-90" />
                </motion.div>
              </button>
            </motion.li>
          ))}
        </motion.ul>
      )}

      {isMobile && cityInput.length >= 3 && !isSearching && searchResults.length === 0 && (
        <div className="w-full bg-white border border-gray-300 rounded-lg mb-3 shadow-lg p-4 text-center">
          <p className="text-gray-500">No se encontraron ciudades</p>
          <p className="text-xs text-gray-400 mt-1">Intenta con otro término de búsqueda</p>
        </div>
      )}

      <div className="relative" ref={searchContainerRef}>
        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-stone-500 focus-within:border-transparent">
          <Search size={20} className="text-gray-400 ml-3" />
          <input
            ref={inputRef}
            type="text"
            value={cityInput}
            onChange={handleSearchInputChange}
            placeholder="Escribe el nombre de tu ciudad"
            className="w-full py-3 px-3 focus:outline-none"
            aria-label="Buscar ciudad"
          />
          {isSearching && <Loader2 size={20} className="text-gray-400 mr-3 animate-spin" />}
          {cityInput && !isSearching && (
            <button
              onClick={() => setCityInput("")}
              className="p-2 mr-1 text-gray-400 hover:text-gray-600"
              aria-label="Limpiar búsqueda"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {cityInput.length > 0 && cityInput.length < 3 && (
          <p className="text-xs text-gray-500 mt-2">Escribe al menos 3 caracteres para buscar</p>
        )}

        {isSearching && <p className="text-xs text-gray-500 mt-2">Buscando ciudades...</p>}

        {/* Search results for desktop - positioned BELOW the input */}
        {!isMobile && searchResults.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 shadow-lg overflow-hidden">
            {searchResults.map((city, index) => (
              <motion.li
                key={index}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={index !== searchResults.length - 1 ? "border-b border-gray-100" : ""}
              >
                <button
                  onClick={() => handleConfirmCity(city.nombre)}
                  className="w-full text-left py-4 px-4 hover:bg-gray-50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-stone-100 p-2 rounded-full">
                      <MapPin size={18} className="text-stone-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-stone-800 group-hover:text-stone-900">
                        {city.nombre || "Ciudad"}
                      </span>
                    </div>
                  </div>
                  <motion.div whileHover={{ x: 3 }} className="text-stone-500 group-hover:text-stone-700">
                    <ChevronDown size={18} className="transform -rotate-90" />
                  </motion.div>
                </button>
              </motion.li>
            ))}
          </ul>
        )}

        {!isMobile && cityInput.length >= 3 && !isSearching && searchResults.length === 0 && (
          <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 shadow-lg p-4 text-center">
            <p className="text-gray-500">No se encontraron ciudades</p>
            <p className="text-xs text-gray-400 mt-1">Intenta con otro término de búsqueda</p>
          </div>
        )}
      </div>
    </motion.div>
  )

  const mainContent = (
    <div className="space-y-6">
      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
        <div className="relative space-y-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>

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
              <span>{isLoadingLocation ? "Detectando ubicación..." : "Usar mi ubicación actual"}</span>
            </motion.button>

            <div className="flex items-center my-3">
              <hr className="flex-grow border-gray-300" />
              <span className="px-3 text-sm text-gray-500">o</span>
              <hr className="flex-grow border-gray-300" />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleShowManualSearch}
              className="w-full py-3 px-4 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors"
            >
              <Search size={20} className="mr-2" />
              <span>Buscar manualmente</span>
            </motion.button>
          </div>

          {locationError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-600 mt-2 p-3 bg-red-50 rounded-lg"
            >
              {locationError}
            </motion.div>
          )}

          <span className="block text-xs text-stone-400 mt-4">
            Los precios entre provincias o zonas de la Argentina, suelen variar entre un 5% o 10%, por lo que para
            obtener datos más precisos es necesario especificarlo.
          </span>
        </div>
      </motion.div>
    </div>
  )

  const renderContent = () => {
    if (showSuccess) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-stone-100 rounded-full p-3 mb-4">
            <Check size={32} className="text-stone-600" />
          </motion.div>
          <p className="text-lg font-medium text-gray-900">Ubicación actualizada</p>
        </div>
      )
    }

    if (showCityConfirmation) {
      return cityConfirmationContent
    }

    if (showManualSearch) {
      return manualSearchContent
    }

    return mainContent
  }

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
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl p-6 max-h-[85vh] overflow-y-auto"
              onKeyDown={handleKeyDown}
            >
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Cerrar"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              {renderContent()}
            </motion.div>
          ) : (
            <div className="fixed inset-0 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="bg-white rounded-xl p-6 w-[90%] max-w-md shadow-2xl"
                onKeyDown={handleKeyDown}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Cerrar"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
                {renderContent()}
              </motion.div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  )
}

export default SettingsModal

