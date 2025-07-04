import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { otpService } from '../services/otpService.js';
import { smsService } from '../services/smsService.js';
import logger from '../config/logger.js';

export const sendOTP = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format',
        errors: errors.array()
      });
    }

    const { phoneNumber } = req.body;
    
    // Generate and store OTP
    const otp = otpService.generateOTP();
    otpService.storeOTP(phoneNumber, otp);
    
    // Send OTP via SMS
    const smsResult = await smsService.sendOTP(phoneNumber, otp);
    
    if (!smsResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.'
      });
    }

    logger.info(`OTP sent to ${phoneNumber}`);
    
    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your mobile number'
    });

  } catch (error) {
    logger.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again.'
    });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input format',
        errors: errors.array()
      });
    }

    const { phoneNumber, otp } = req.body;
    
    // Verify OTP
    const isValid = otpService.verifyOTP(phoneNumber, otp);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please try again.'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { phoneNumber, timestamp: Date.now() },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    
    // Clean up OTP
    otpService.clearOTP(phoneNumber);
    
    logger.info(`User authenticated: ${phoneNumber}`);
    
    res.status(200).json({
      success: true,
      message: 'Login successful! Welcome to Chera Home Appliances.',
      token,
      user: {
        phoneNumber: phoneNumber,
        isVerified: true
      }
    });

  } catch (error) {
    logger.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again.'
    });
  }
};