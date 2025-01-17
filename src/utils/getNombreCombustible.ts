// Helper function to get fuel name
type NombresCombustibles = {
    [key: number]: { [key: string]: string } | string;
  };
  
  const nombresCombustibles: NombresCombustibles = {
    19: {
      YPF: "DIESEL500",
      "SHELL C.A.P.S.A.": "Shell Evolux Diesel",
      AXION: "AXION Diesel X10",
      PUMA: "PUMA Diesel",
    },
    21: {
      YPF: "INFINIA DIESEL",
      "SHELL C.A.P.S.A.": "Shell V-Power Diesel",
      AXION: "QUANTIUM Diesel X10",
      PUMA: "ION PUMA Diesel",
    },
    6: "GNC",
    2: {
      YPF: "SUPER",
      "SHELL C.A.P.S.A.": "Shell Super",
      AXION: "Axion SUPER",
      PUMA: "PUMA Super",
    },
    3: {
      YPF: "INFINIA",
      "SHELL C.A.P.S.A.": "Shell V-Power",
      AXION: "QUANTIUM",
      PUMA: "MAX Premium",
    },
  };
  
  export const getNombreCombustible = (tipoCombustible: number, empresa: string): string => {
    const tipoCombustibleKey = tipoCombustible.toString();
  
    if (nombresCombustibles[Number(tipoCombustibleKey)]) {
      if (typeof nombresCombustibles[Number(tipoCombustibleKey)] === "object") {
        const nombreEmpresa = (nombresCombustibles[Number(tipoCombustibleKey)] as { [key: string]: string })[empresa];
        return nombreEmpresa || "Tipo de Combustible Desconocido";
      } else {
        return nombresCombustibles[Number(tipoCombustibleKey)] as string;
      }
    } else {
      return "Tipo de Combustible Desconocido";
    }
  };