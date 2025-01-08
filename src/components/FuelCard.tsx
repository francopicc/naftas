import { motion } from 'framer-motion';
import { ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';

interface FuelCardProps {
  estacion: {
    [key: string]: number;
  };
  estacionName: string;
  indicadorEmpresa: number;
  colorIndicador: string;
  setSelectedFuel: (fuel: {
    isOpen: boolean;
    estacion: {
      [key: string]: number;
    };
    estacionName: string;
    combustible: number;
    tipoCombustible: string;
  }) => void;
}

const FuelCard = ({ estacion, estacionName, indicadorEmpresa, colorIndicador, setSelectedFuel }: FuelCardProps) => {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
            <img
              src={`/assets/${
                estacionName.toLowerCase() === "shell c.a.p.s.a." ? "shell" : estacionName.toLowerCase()
              }.jpg`}
              alt=""
              className="h-12 w-12 object-cover"
            />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">{estacionName}</h2>
        </div>
        <div className={`flex items-center space-x-1 ${colorIndicador}`}>
          {indicadorEmpresa > 50 ? (
            <TrendingUp size={16} />
          ) : (
            <TrendingDown size={16} />
          )}
          <span className="text-sm font-medium">
            {indicadorEmpresa.toFixed(0)}
          </span>
        </div>
      </div>

      {Object.entries(estacion).map(([tipoCombustible, precio], index) => (
        <div key={tipoCombustible} className="mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-900">
                {tipoCombustible}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 rounded flex items-center space-x-2 hover:bg-gray-50 transition-colors"
              onClick={() => setSelectedFuel({
                isOpen: true,
                estacion,
                estacionName,
                combustible: precio,
                tipoCombustible
              })}
            >
              <p className="font-medium text-medium text-gray-900 min-w-[5em] max-w-[5em]">${precio.toFixed(2)} /l</p>
              <ChevronRight size={20} className="text-gray-400" />
            </motion.button>
          </div>
          {index < Object.entries(estacion).length - 1 && (
            <div className="border-t border-gray-100 my-4" />
          )}
        </div>
      ))}
    </div>
  );
};

export default FuelCard;

