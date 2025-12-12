// Mock API Service for KhaoNow Delivery Partner App
// This is a frontend simulation - will be replaced with real API calls later

interface LoginResponse {
  success: boolean;
  exists: boolean;
  partnerId?: string;
  message?: string;
}

interface OtpResponse {
  success: boolean;
  token?: string;
  partnerId?: string;
  message?: string;
}

interface RegistrationData {
  name: string;
  email: string;
  aadhaarNumber: string;
  panNumber: string;
  aadhaarPhoto?: string;
  panPhoto?: string;
  vehicleType: string;
  vehicleNumber: string;
  rcPhoto?: string;
  drivingLicenseNumber: string;
  drivingLicensePhoto?: string;
  profilePhoto?: string;
}

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock storage for demo purposes
const mockDatabase: Record<string, any> = {
  '+919876543210': {
    exists: true,
    partnerId: 'PARTNER001',
    name: 'Rahul Kumar',
    status: 'active',
  },
};

export const ApiService = {
  // Send OTP to phone number
  async sendOtp(phoneNumber: string): Promise<LoginResponse> {
    await delay(1000);
    
    const exists = !!mockDatabase[phoneNumber];
    
    // Mock: In development, log the OTP for easy testing
    const mockOtp = '123456';
    console.log('📱 Mock OTP for', phoneNumber, ':', mockOtp);
    console.log('💡 Hint: Any 6-digit number will work in this demo');
    
    return {
      success: true,
      exists,
      partnerId: exists ? mockDatabase[phoneNumber].partnerId : undefined,
      message: 'OTP sent successfully',
    };
  },

  // Verify OTP
  async verifyOtp(phoneNumber: string, otp: string): Promise<OtpResponse> {
    await delay(800);
    
    // Mock: For demo, accept any 6-digit OTP
    // In production, this would validate against the backend
    if (otp.length === 6 && /^\d{6}$/.test(otp)) {
      const isExistingUser = !!mockDatabase[phoneNumber];
      const partnerId = isExistingUser 
        ? mockDatabase[phoneNumber].partnerId 
        : 'PARTNER' + Math.floor(Math.random() * 100000);
      
      return {
        success: true,
        token: 'mock-jwt-token-' + Date.now(),
        partnerId,
        message: 'OTP verified successfully',
      };
    }
    
    return {
      success: false,
      message: 'Invalid OTP. Please enter a valid 6-digit code.',
    };
  },

  // Submit registration
  async submitRegistration(data: RegistrationData): Promise<{ success: boolean; message: string; partnerId?: string }> {
    await delay(1500);
    
    // Mock: always succeed
    const partnerId = 'PARTNER' + Math.floor(Math.random() * 100000);
    
    return {
      success: true,
      message: 'Registration submitted successfully',
      partnerId,
    };
  },

  // Get partner dashboard data
  async getDashboardData(partnerId: string): Promise<any> {
    await delay(500);
    
    return {
      earnings: {
        today: 850,
        week: 4250,
        month: 18500,
      },
      stats: {
        deliveriesToday: 12,
        shiftsCompleted: 3,
        activeOrders: 1,
      },
      onlineStatus: true,
      activeOrder: {
        orderId: 'ORD123456',
        restaurant: 'Burger King',
        customer: 'Amit Sharma',
        address: '123, MG Road, Bangalore',
        amount: 385,
        status: 'picked_up',
      },
    };
  },

  // Toggle online/offline status
  async toggleOnlineStatus(partnerId: string, status: boolean): Promise<{ success: boolean; status: boolean }> {
    await delay(300);
    
    return {
      success: true,
      status,
    };
  },
};
