from django.db import models
from django.contrib.auth.models import AbstractUser


# Roles for users
class User(AbstractUser):
	ROLE_NGO = 'ngo'
	ROLE_HOTEL = 'hotel'  # hotels / donors

	ROLE_CHOICES = [
		(ROLE_NGO, 'NGO'),
		(ROLE_HOTEL, 'Hotel / Donor'),
	]

	role = models.CharField(max_length=20, choices=ROLE_CHOICES)
	business_license_number = models.CharField(max_length=255, blank=True, null=True)
	ngo_registration_number = models.CharField(max_length=255, blank=True, null=True)
	otp = models.CharField(max_length=6, blank=True, null=True)
	otp_verified = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return f"{self.username} ({self.role})"


class EmailOTP(models.Model):
	email = models.EmailField(unique=True)
	otp = models.CharField(max_length=6)
	created_at = models.DateTimeField(auto_now_add=True)
	attempts = models.IntegerField(default=0)

	def __str__(self):
		return f"{self.email} - {self.otp}"
