from django.urls import path 
from . import views 

from django.conf import settings
from django.conf.urls.static import static

# rutas 

urlpatterns=[
     path('', views.Login, name='login'),
    path('logout/', views.Logout, name='logout'),

]