from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from requerimientos.models import Usuario as UsuarioReq

DB_REQ = 'requerimientos'

def Login(request):
    if request.method == "POST":
        documento  = request.POST.get('documento')
        contrasena = request.POST.get('contrasena')

        user = authenticate(request, username=documento, password=contrasena)
        if user is not None:
            login(request, user)
            request.session['usuario'] = user.username

            try:
                usr_req = UsuarioReq.objects.using(DB_REQ).get(
                    Cedula=user.username, Estado=1
                )
                request.session['req_user_id']      = usr_req.IdUsuario
                request.session['req_user_nombre']  = usr_req.NombreCompleto
                request.session['req_tipo_usuario'] = usr_req.TipoUsuario or 0
                # ← AQUÍ EN ESTA LÍNEA AGREGAS:
                partes = usr_req.NombreCompleto.split()
                request.session['req_user_primer_nombre'] = partes[2] if len(partes) >= 3 else partes[0]

            except UsuarioReq.DoesNotExist:
                request.session['req_user_id']            = None
                request.session['req_user_nombre']        = user.get_full_name() or user.username
                request.session['req_tipo_usuario']       = 0
                request.session['req_user_primer_nombre'] = user.username

            return redirect('dashboard')
        else:
            messages.error(request, "Documento o contraseña incorrecta")

    return render(request, "index/login.html")


def Logout(request):
    logout(request)
    return redirect('login')