import * as Yup from 'yup';

export const phoneValidation = Yup.string()
  .matches(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits')
  .required('Phone number is required');

export const otpValidation = Yup.string()
  .matches(/^[0-9]{6}$/, 'OTP must be exactly 6 digits')
  .required('OTP is required');

export const nameValidation = Yup.string()
  .min(3, 'Name must be at least 3 characters')
  .required('Name is required');

export const emailValidation = Yup.string()
  .email('Invalid email address')
  .required('Email is required');

export const aadhaarValidation = Yup.string()
  .matches(/^[0-9]{12}$/, 'Aadhaar number must be exactly 12 digits')
  .required('Aadhaar number is required');

export const panValidation = Yup.string()
  .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format')
  .required('PAN number is required');

export const vehicleNumberValidation = Yup.string()
  .matches(/^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$/, 'Invalid vehicle number format (e.g., KA01AB1234)')
  .required('Vehicle number is required');

export const drivingLicenseValidation = Yup.string()
  .min(8, 'Invalid driving license number')
  .required('Driving license number is required');

export const LoginSchema = Yup.object().shape({
  phoneNumber: phoneValidation,
});

export const OtpSchema = Yup.object().shape({
  otp: otpValidation,
});

export const BasicDetailsSchema = Yup.object().shape({
  name: nameValidation,
  email: emailValidation,
});

export const KycDocumentsSchema = Yup.object().shape({
  aadhaarNumber: aadhaarValidation,
  panNumber: panValidation,
});

export const VehicleDetailsSchema = Yup.object().shape({
  vehicleType: Yup.string().required('Vehicle type is required'),
  vehicleNumber: vehicleNumberValidation,
  drivingLicenseNumber: drivingLicenseValidation,
});
