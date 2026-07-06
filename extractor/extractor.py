import sys
import json
import os
import pdfplumber

COLUMNAS_ESPERADAS = [
    "documento",
    "expediente",
    "placa",
    "vigencia",
    "nombre",
    "valor_embargo",
    "fecha_embargo",
    "fecha_levantamiento",
    "sade_banco",
]


def extraer_pdf(ruta_pdf):

    filas = []
    numero_fila_global = 0

    with pdfplumber.open(ruta_pdf) as pdf:
        for pagina_num, pagina in enumerate(pdf.pages, start=1):
            tablas = pagina.extract_tables()

            for tabla in tablas:
                if not tabla:
                    continue

                encabezado_pdf = tabla[0]
                filas_de_datos = tabla[1:]

                for fila_cruda in filas_de_datos:
                    numero_fila_global += 1

                    fila_dict = dict(zip(COLUMNAS_ESPERADAS, fila_cruda))

                    fila_limpia = {
                        clave: (valor.strip() if valor else "")
                        for clave, valor in fila_dict.items()
                    }

                    fila_limpia["numero_fila"] = numero_fila_global
                    fila_limpia["pagina"] = pagina_num

                    filas.append(fila_limpia)

    return filas

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Debes indicar la ruta del PDF como argumento"}))
        sys.exit(1)

    ruta_pdf = sys.argv[1]

    if not os.path.isfile(ruta_pdf):
        print(json.dumps({"error": f"No se encontró el archivo: {ruta_pdf}"}))
        sys.exit(1)

    filas = extraer_pdf(ruta_pdf)

    resultado = {
        "archivo": os.path.basename(ruta_pdf),
        "total_filas": len(filas),
        "filas": filas,
    }

    print(json.dumps(resultado, ensure_ascii=False))

if __name__ == "__main__":
    main()