"""Genera el PDF del manual del Portal de Requerimientos.

Fuente:  docs/manual/manual_portal_requerimientos.html
Salida:  index/static/docs/Manual_Portal_de_Requerimientos.pdf (el que abre el
         botón de manual del portal)
Motor:   xhtml2pdf, el mismo que ya usa el proyecto.

Uso (desde la raíz del proyecto, con el venv):
    venv\\Scripts\\python.exe docs\\manual\\generar_manual.py [ruta_salida.pdf]

Para actualizar el manual: editar el HTML y volver a correr este script. Sin
argumento sobrescribe el PDF del portal; con una ruta, lo deja ahí (útil para
revisar un borrador antes de publicarlo).

El índice ("Contenido") se arma solo: se genera el PDF una vez, se leen de los
marcadores del PDF las páginas donde quedó cada título (h1/h2) y se vuelve a
generar con esos números. No hay que escribir páginas a mano.

Las estrellas, círculos y flechas salen de la fuente "Segoe UI Symbol" de
Windows (Helvetica no trae esos símbolos).
"""
import html as _html
import io
import os
import re
import sys

from pypdf import PdfReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from xhtml2pdf import pisa
from xhtml2pdf.default import DEFAULT_FONT

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.normpath(os.path.join(AQUI, '..', '..'))
HTML = os.path.join(AQUI, 'manual_portal_requerimientos.html')
SALIDA = (sys.argv[1] if len(sys.argv) > 1 else
          os.path.join(RAIZ, 'index', 'static', 'docs', 'Manual_Portal_de_Requerimientos.pdf'))
FUENTE_SIMBOLOS = r'C:\Windows\Fonts\seguisym.ttf'

# Se registra directo en reportlab y no con @font-face en el HTML: en Windows
# xhtml2pdf copia la fuente a un archivo temporal que después no puede abrir.
pdfmetrics.registerFont(TTFont('Simbolos', FUENTE_SIMBOLOS))
DEFAULT_FONT['simbolos'] = 'Simbolos'

MARCA_INDICE = re.compile(r'<!--INDICE:.*?-->.*?<!--/INDICE-->', re.S)


def _generar(html_txt):
    buf = io.BytesIO()
    resultado = pisa.CreatePDF(html_txt, dest=buf, encoding='utf-8')
    if resultado.err:
        sys.exit(f'Error al generar el PDF ({resultado.err} errores)')
    return buf.getvalue()


def _titulos(pdf):
    """[(título, página)] de los marcadores del PDF (h1 y h2), en orden."""
    lector = PdfReader(io.BytesIO(pdf))
    salida = []

    def recorrer(items):
        for item in items:
            if isinstance(item, list):
                recorrer(item)
            else:
                salida.append((' '.join(item.title.split()), lector.get_destination_page_number(item) + 1))

    recorrer(lector.outline)
    return salida


def _con_indice(html_txt, titulos):
    filas = ''.join(
        f'<tr><td>{_html.escape(t)}</td><td class="pag">{p}</td></tr>' for t, p in titulos
    )
    tabla = f'<table class="indice" width="100%">{filas}</table>'
    return MARCA_INDICE.sub(lambda m: tabla, html_txt, count=1)


with open(HTML, encoding='utf-8') as f:
    fuente = f.read()
if not MARCA_INDICE.search(fuente):
    sys.exit('No se encontró la marca <!--INDICE: ...--><!--/INDICE--> en el HTML')

# 1ª pasada sin índice para saber dónde cae cada título; luego se repite con
# el índice puesto hasta que las páginas no cambien (normalmente 1 vez).
titulos = _titulos(_generar(fuente))
for _ in range(3):
    pdf = _generar(_con_indice(fuente, titulos))
    nuevos = _titulos(pdf)
    if nuevos == titulos:
        break
    titulos = nuevos
else:
    sys.exit('Las páginas del índice no se estabilizaron')

with open(SALIDA, 'wb') as destino:
    destino.write(pdf)

print(f'PDF generado: {SALIDA} — {len(PdfReader(io.BytesIO(pdf)).pages)} páginas')
for t, p in titulos:
    print(f'   {p:>3}  {t}')
