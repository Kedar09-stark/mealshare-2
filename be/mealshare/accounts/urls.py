from django.urls import path
from . import views

urlpatterns = [
	path('register/', views.RegisterView.as_view(), name='api-register'),
	path('login/', views.LoginView.as_view(), name='api-login'),
	path('send-otp/', views.SendOTPView.as_view(), name='api-send-otp'),
	path('verify-otp/', views.VerifyOTPView.as_view(), name='api-verify-otp'),
	path('me/', views.UserView.as_view(), name='api-user'),
	path('users/<str:username>/', views.UserDetailView.as_view(), name='api-user-detail'),
]
