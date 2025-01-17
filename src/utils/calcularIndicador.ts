interface Combustible {
    precio: number;
    fecha_vigencia: string;
    nombre_combustible: string;
}

interface Empresa {
    [combustible: string]: Combustible;
}

export const calcularIndicadorEmpresa = (empresa: Empresa, promedioGeneral: number, promedioFechaGeneral: number): number => {
    let sumaPreciosEmpresa = 0;
    let cantidadPrecios = 0;
    let sumaFechasActualizacion = 0;
  
    Object.entries(empresa).forEach(([_, combustible]) => {
      sumaPreciosEmpresa += combustible.precio;
      sumaFechasActualizacion += new Date(combustible.fecha_vigencia).getTime();
      cantidadPrecios++;
    });
  
    const precioPromedioEmpresa = sumaPreciosEmpresa / cantidadPrecios;
    const fechaPromedioEmpresa = sumaFechasActualizacion / cantidadPrecios;
  
    const diferenciaPrecio = ((promedioGeneral - precioPromedioEmpresa) / promedioGeneral) * 100;
    const puntajePrecio = 50 + (diferenciaPrecio * 2.5);
    const puntajePrecioAjustado = Math.max(0, Math.min(100, puntajePrecio)) * 0.6;
  
    const diferenciaFecha = (fechaPromedioEmpresa - promedioFechaGeneral) / (1000 * 60 * 60 * 24);
    const puntajeFecha = 50 + (diferenciaFecha * 3);
    const puntajeFechaAjustado = Math.max(0, Math.min(100, puntajeFecha)) * 0.5;
  
    return puntajePrecioAjustado + puntajeFechaAjustado;
  };
  