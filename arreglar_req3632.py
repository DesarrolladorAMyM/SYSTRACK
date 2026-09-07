# -*- coding: utf-8 -*-
"""
Arregla REQ-3632: lo pasa a la subcategoria COMPRAS (39) y lo devuelve al
flujo de aprobacion del jefe de area.

CONTEXTO
--------
REQ-3632 se creo en una categoria equivocada. Despues se corrigio a
"Soporte tecnico Externo" (37) pero quedo en la subcategoria 41
(SOLICITUD DE EQUIPO), y el flujo de aprobacion NUNCA se disparo, porque
`requiere_aprobacion` solo se evalua al crear el requerimiento. Resultado:
TokenAprobacion NULL, IdJefeArea 0, y la jefe del area nunca se entero.

QUE HACE
--------
1. Pone IdSubCategoria = 39 (COMPRAS) en memoria.
2. Llama a _enviar_a_aprobacion_jefe(), que valida todo, genera el token,
   pasa el requerimiento a estado 7 (Pendiente Aprobacion), libera al
   tecnico asignado y envia el correo de aprobacion a la jefe del area.

El cambio de subcategoria NO se guarda por separado a proposito: lo
persiste el save() del helper. Asi, si alguna validacion falla, no se
escribe absolutamente nada.

IMPORTANTE — EJECUTAR EN EL SERVIDOR
------------------------------------
Debe correrse en el servidor, NO en un entorno local. El correo lleva los
links de aprobar/rechazar construidos con SITE_URL; en local esa variable
apunta a 127.0.0.1 y la jefe recibiria links inservibles.

USO
---
    python arreglar_req3632.py              # SIMULACRO: no escribe ni envia nada
    python arreglar_req3632.py --aplicar    # aplica de verdad

Colocar el archivo en la raiz del proyecto (junto a manage.py).
"""
import io
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'systraker.settings')

import django
django.setup()

from django.conf import settings
from requerimientos.models import Requerimiento, Categoria, SubCategoria, Usuario, Area
from requerimientos.views import (
    _normaliza, _obtener_link_base, _enviar_a_aprobacion_jefe,
    CATEGORIA_SOPORTE_EXTERNO, SUBCATEGORIAS_REQUIEREN_APROBACION,
)

DB = 'requerimientos'
CODIGO = 3632
SUBCATEGORIA_DESTINO = 39  # COMPRAS

APLICAR = '--aplicar' in sys.argv


def main():
    r = Requerimiento.objects.using(DB).filter(Codigo=CODIGO).first()
    if not r:
        print(f'ERROR: no existe el requerimiento con Codigo={CODIGO}.')
        return 1

    cat = Categoria.objects.using(DB).filter(IdCategoria=r.IdCategoria).first()
    sub_actual = SubCategoria.objects.using(DB).filter(IdSubCategoria=r.IdSubCategoria).first()
    sub_nueva = SubCategoria.objects.using(DB).filter(IdSubCategoria=SUBCATEGORIA_DESTINO).first()

    if not sub_nueva:
        print(f'ERROR: no existe la subcategoria {SUBCATEGORIA_DESTINO}.')
        return 1

    print('=' * 70)
    print(f'  {r.codigo()}   {"*** APLICANDO ***" if APLICAR else "--- SIMULACRO (no escribe nada) ---"}')
    print('=' * 70)
    print(f'  Solicitante     : {r.NombreUsuario} (cedula {r.CedulaUsuario})')
    print(f'  Descripcion     : {(r.Requerimiento or "")[:80]}')
    print()
    print('  ESTADO ACTUAL')
    print(f'    IdCategoria     : {r.IdCategoria}  ({cat.Descripcion if cat else "?"})')
    print(f'    IdSubCategoria  : {r.IdSubCategoria}  ({sub_actual.Descripcion if sub_actual else "?"})')
    print(f'    IdEstado        : {r.IdEstado}')
    print(f'    IdUsuarioAsig   : {r.IdUsuarioAsig}  ({r.NombreUsuariAsig})')
    print(f'    IdJefeArea      : {r.IdJefeArea}')
    print(f'    TokenAprobacion : {r.TokenAprobacion}')

    # ── Resolver a quien le llegaria el correo, para poder mostrarlo ──
    solicitante = Usuario.objects.using(DB).filter(IdUsuario=r.IdUsuario).first()
    area = None
    jefe = None
    if solicitante and solicitante.IdArea:
        area = Area.objects.using(DB).filter(IdArea=solicitante.IdArea).first()
        if area:
            jefe = Usuario.objects.using(DB).filter(
                Email__iexact=area.CorreoJefe, Estado=1
            ).first()

    sub_norm = _normaliza(sub_nueva.Descripcion)
    exigira = (
        _normaliza(cat.Descripcion if cat else '') == CATEGORIA_SOPORTE_EXTERNO
        and any(sub_norm.startswith(s) for s in SUBCATEGORIAS_REQUIEREN_APROBACION)
    )

    print()
    print('  CAMBIO A REALIZAR')
    print(f'    IdSubCategoria  : {r.IdSubCategoria} -> {SUBCATEGORIA_DESTINO} ({sub_nueva.Descripcion})')
    print(f'    ¿Exigira aprobacion con esa subcategoria? {exigira}')
    print(f'    Area del solicitante : {area.NombreArea if area else "?"}')
    print(f'    Correo del jefe      : {area.CorreoJefe if area else "?"}')
    print(f'    Jefe destino         : {jefe.NombreCompleto if jefe else "*** NO ENCONTRADO ***"}')
    print()
    print(f'    SITE_URL en uso      : {_obtener_link_base()}')
    if '127.0.0.1' in _obtener_link_base() or 'localhost' in _obtener_link_base():
        print()
        print('    #########################################################')
        print('    #  ATENCION: SITE_URL apunta a localhost.               #')
        print('    #  El correo saldria con links INSERVIBLES para el jefe.#')
        print('    #  NO ejecutes con --aplicar en este entorno.           #')
        print('    #########################################################')
        if APLICAR:
            print()
            print('  ABORTADO: no se aplica nada con SITE_URL en localhost.')
            return 1

    print(f'    EMAIL_BACKEND        : {settings.EMAIL_BACKEND}')
    print()
    print('  QUEDARIA ASI')
    print(f'    IdSubCategoria  : {SUBCATEGORIA_DESTINO}')
    print('    IdEstado        : 7    (Pendiente Aprobacion)')
    print('    IdUsuarioAsig   : None (se libera el tecnico actual)')
    print(f'    IdJefeArea      : {jefe.IdUsuario if jefe else "?"}')
    print('    TokenAprobacion : <uuid nuevo>')
    print()
    print('  Y al aprobar la jefe, el requerimiento pasa a estado 1 (Abierto)')
    print('  SIN tecnico: cae en la bandeja "por asignar" para asignarlo a mano.')
    print('=' * 70)

    if not APLICAR:
        print()
        print('  SIMULACRO TERMINADO — no se escribio ni se envio nada.')
        print('  Para aplicarlo de verdad:  python arreglar_req3632.py --aplicar')
        return 0

    # ── Aplicar ──
    # La subcategoria se cambia SOLO en memoria: la persiste el save() del
    # helper. Si el helper rechaza la operacion, no se escribe nada.
    r.IdSubCategoria = SUBCATEGORIA_DESTINO
    ok, detalle = _enviar_a_aprobacion_jefe(r)

    print()
    print(f'  Resultado: {"OK" if ok else "NO SE HIZO NADA"}')
    print(f'  Detalle  : {detalle}')

    if not ok:
        print()
        print('  El requerimiento quedo INTACTO (el helper valida antes de escribir).')
        return 1

    # Verificacion posterior, releyendo de la base
    v = Requerimiento.objects.using(DB).get(Codigo=CODIGO)
    print()
    print('  VERIFICACION (releido de la base)')
    print(f'    IdSubCategoria  : {v.IdSubCategoria}')
    print(f'    IdEstado        : {v.IdEstado}')
    print(f'    IdUsuarioAsig   : {v.IdUsuarioAsig}')
    print(f'    NombreUsuariAsig: {v.NombreUsuariAsig}')
    print(f'    IdJefeArea      : {v.IdJefeArea}')
    print(f'    TokenAprobacion : {"generado (" + str(len(v.TokenAprobacion)) + " chars)" if v.TokenAprobacion else "NULL"}')
    print()
    print('  Revisa el log de requerimientos para confirmar el envio del correo.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
