import datetime
import jwt
from typing import Tuple, Optional
from .authentication import JWTAuthentication
from django.conf import settings
from django.contrib.auth import authenticate

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, authentication
from rest_framework.exceptions import AuthenticationFailed

from .models import User


def _make_token(user: User) -> str:
	payload = {
		'user_id': user.id,
		'username': user.username,
		'role': user.role,
		'exp': datetime.datetime.utcnow() + datetime.timedelta(seconds=getattr(settings, 'JWT_EXP_DELTA_SECONDS', 86400)),
	}
	token = jwt.encode(payload, settings.JWT_SECRET, algorithm=getattr(settings, 'JWT_ALGORITHM', 'HS256'))
	if isinstance(token, bytes):
		token = token.decode('utf-8')
	return token


# class JWTAuthentication(authentication.BaseAuthentication):
# 	keyword = 'Bearer'

# 	def authenticate(self, request) -> Optional[Tuple[User, str]]:
# 		auth_header = authentication.get_authorization_header(request).split()
# 		if not auth_header:
# 			return None

# 		if auth_header[0].decode().lower() != self.keyword.lower():
# 			return None

# 		if len(auth_header) == 1:
# 			raise AuthenticationFailed('Invalid token header. No credentials provided.')
# 		elif len(auth_header) > 2:
# 			raise AuthenticationFailed('Invalid token header')

# 		token = auth_header[1].decode()
# 		try:
# 			payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[getattr(settings, 'JWT_ALGORITHM', 'HS256')])
# 		except jwt.ExpiredSignatureError:
# 			raise AuthenticationFailed('Token has expired')
# 		except jwt.InvalidTokenError:
# 			raise AuthenticationFailed('Invalid token')

# 		user_id = payload.get('user_id')
# 		try:
# 			user = User.objects.get(id=user_id)
# 		except User.DoesNotExist:
# 			raise AuthenticationFailed('User not found')

# 		return (user, token)


class RegisterView(APIView):
	permission_classes = [permissions.AllowAny]

	def post(self, request):
		username = request.data.get('username')
		email = request.data.get('email')
		password = request.data.get('password')
		role = request.data.get('role')
		business_license_number = request.data.get('businessLicenseNumber')
		ngo_registration_number = request.data.get('ngoRegistrationNumber')

		if not all([username, password, role]):
			return Response({'error': 'username, password and role are required'}, status=status.HTTP_400_BAD_REQUEST)

		# Frontend uses 'hotel' for donors. Accept 'donor' as an alias and normalize to 'hotel'.
		if isinstance(role, str) and role.lower() == 'donor':
			role = User.ROLE_HOTEL

		if role not in (User.ROLE_NGO, User.ROLE_HOTEL):
			return Response({'error': "role must be 'ngo' or 'hotel'"}, status=status.HTTP_400_BAD_REQUEST)

		if role == User.ROLE_HOTEL and not business_license_number:
			return Response({'error': 'businessLicenseNumber is required for hotel role'}, status=status.HTTP_400_BAD_REQUEST)

		if role == User.ROLE_NGO and not ngo_registration_number:
			return Response({'error': 'ngoRegistrationNumber is required for ngo role'}, status=status.HTTP_400_BAD_REQUEST)

		if User.objects.filter(username=username).exists():
			return Response({'error': 'username already taken'}, status=status.HTTP_400_BAD_REQUEST)

		user = User.objects.create_user(
			username=username,
			email=email or '',
			password=password,
			role=role,
			business_license_number=business_license_number or '',
			ngo_registration_number=ngo_registration_number or ''
		)

		token = _make_token(user)

		return Response({'token': token, 'user': {'id': user.id, 'username': user.username, 'email': user.email, 'role': user.role}}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
	permission_classes = [permissions.AllowAny]

	def post(self, request):
		username = request.data.get('username')
		password = request.data.get('password')

		if not all([username, password]):
			return Response({'error': 'username and password are required'}, status=status.HTTP_400_BAD_REQUEST)

		# Attempt authentication and provide debug output in server logs when login fails
		user = authenticate(request, username=username, password=password)
		if user is None:
			# debug: check if user exists and whether the password check passes
			from django.contrib.auth import get_user_model
			UserModel = get_user_model()
			try:
				exists = UserModel.objects.filter(username=username).exists()
				exists_msg = 'exists' if exists else 'not found'
				print(f"Login attempt: username={username!r} -> {exists_msg}")
				if exists:
					u = UserModel.objects.filter(username=username).first()
					pw_ok = u.check_password(password)
					print(f"Password check for {username!r}: {pw_ok}")
			except Exception as e:
				print('Login debug error:', e)
			return Response({'error': 'invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

		token = _make_token(user)

		return Response({'token': token, 'user': {'id': user.id, 'username': user.username, 'email': user.email, 'role': user.role}}, status=status.HTTP_200_OK)


class UserView(APIView):
	authentication_classes = [JWTAuthentication]
	permission_classes = [permissions.IsAuthenticated]

	def get(self, request):
		user: User = request.user
		return Response({'user': {'id': user.id, 'username': user.username, 'email': user.email, 'role': user.role}})


class UserDetailView(APIView):
	authentication_classes = [JWTAuthentication]
	permission_classes = [permissions.IsAuthenticated]

	def get(self, request, username):
		try:
			user = User.objects.get(username=username)
			return Response({'user': {'id': user.id, 'username': user.username, 'email': user.email, 'role': user.role}}, status=status.HTTP_200_OK)
		except User.DoesNotExist:
			return Response({'error': 'user not found'}, status=status.HTTP_404_NOT_FOUND)








# OTP handling views
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from django.conf import settings
from .models import EmailOTP
from .utils import generate_otp
import time

class SendOTPView(APIView):
	permission_classes = [permissions.AllowAny]

	def post(self, request):
		email = request.data.get('email')
		context = request.data.get('context')  # 'registration' or 'login'

		if not email:
			return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

		if context == 'login':
			# Check if user exists with this email
			if not User.objects.filter(email=email).exists():
				return Response({"error": "Email not found"}, status=status.HTTP_400_BAD_REQUEST)

		otp = generate_otp()

		# Update or create EmailOTP record
		EmailOTP.objects.update_or_create(
			email=email,
			defaults={'otp': otp, 'attempts': 0}
		)

		try:
			sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
			sender_email = getattr(settings, 'EMAIL_HOST_USER', 'kedarsumit155@gmail.com')
			
			message = Mail(
				from_email=sender_email,
				to_emails=email,
				subject='MealShare OTP Verification',
				html_content=f'Your OTP for MealShare is: <strong>{otp}</strong><br><br>This OTP will expire in 10 minutes.'
			)
			sg.send(message)
			
			return Response({"message": "OTP sent successfully", "email": email}, status=status.HTTP_200_OK)
		except Exception as e:
			return Response({"error": f"Failed to send OTP: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyOTPView(APIView):
	permission_classes = [permissions.AllowAny]

	def post(self, request):
		email = request.data.get('email')
		otp = request.data.get('otp')
		context = request.data.get('context')  # 'registration' or 'login'

		if not email or not otp:
			return Response({"error": "Email and OTP are required"}, status=status.HTTP_400_BAD_REQUEST)

		try:
			email_otp = EmailOTP.objects.get(email=email)
		except EmailOTP.DoesNotExist:
			return Response({"error": "OTP not found or expired"}, status=status.HTTP_400_BAD_REQUEST)

		# Check attempts
		if email_otp.attempts >= 5:
			return Response({"error": "Too many attempts. Please request a new OTP"}, status=status.HTTP_400_BAD_REQUEST)

		# Check OTP expiration (10 minutes)
		created_time = email_otp.created_at.timestamp()
		current_time = time.time()
		if current_time - created_time > 600:  # 10 minutes
			EmailOTP.objects.filter(email=email).delete()
			return Response({"error": "OTP expired. Please request a new one"}, status=status.HTTP_400_BAD_REQUEST)

		# Verify OTP
		if email_otp.otp != otp:
			email_otp.attempts += 1
			email_otp.save()
			remaining_attempts = 5 - email_otp.attempts
			return Response({"error": f"Invalid OTP. {remaining_attempts} attempts remaining"}, status=status.HTTP_400_BAD_REQUEST)

		# OTP is valid
		if context == 'registration':
			return Response({"message": "OTP verified successfully", "verified": True}, status=status.HTTP_200_OK)
		elif context == 'login':
			# Get user and create token
			try:
				user = User.objects.get(email=email)
				token = _make_token(user)
				EmailOTP.objects.filter(email=email).delete()
				return Response({
					"message": "Login successful",
					"token": token,
					"user": {
						"id": user.id,
						"username": user.username,
						"email": user.email,
						"role": user.role
					}
				}, status=status.HTTP_200_OK)
			except User.DoesNotExist:
				return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
		else:
			return Response({"error": "Invalid context"}, status=status.HTTP_400_BAD_REQUEST)