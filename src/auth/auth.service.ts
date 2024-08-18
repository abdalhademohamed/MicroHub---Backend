import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Req,
  UnauthorizedException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../user/entities/user.entity';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { MailService } from '../user/utils/Email.Service';
import * as crypto from 'crypto';
import { LoginAuthDto } from './dto/login.auth.dto';
import { v4 as uuidv4 } from 'uuid'; // For generating unique tokens
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly UserRepository: Repository<UserEntity>,
    private JwtService: JwtService,
    private MailService: MailService,
    private configService: ConfigService,
  ) {}

  async signUp(createUserDto: CreateUserDto): Promise<UserEntity> {
    const { username, email, password, role } = createUserDto;

    // Check for existing user
    try {
      const existingUser = await this.UserRepository.findOne({
        where: [{ email }],
      });

      if (existingUser) {
        if (existingUser.email === email) {
          throw new ConflictException('Email already exists');
        }
        if (existingUser.username === username) {
          throw new ConflictException('Username already exists');
        }
      }

      // Hash the password
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(password, salt);

      // // Generate OTP
      // const otp = this.generateOtp();

      // Create new user
      const user = this.UserRepository.create({
        username,
        email,
        password: hashedPassword,
        role,
        // otp,
        otpExpiration: new Date(Date.now() + 10 * 60 * 1000), // OTP valid for 10 minutes
      });

      // Save user to database
      const newUser = await this.UserRepository.save(user);

      // Send OTP email
      // await this.sendOtpEmail(newUser.email, otp);

      return newUser;
    } catch (error) {
      // console.error('Error during signUp:', error);
      throw new InternalServerErrorException('Failed to sign up user');
    }
  }

  private generateOtp(): string {
    return crypto.randomBytes(3).toString('hex'); // Generates a 6-digit OTP
  }

  async verifyOtp(VerifyOtpDto): Promise<any> {
    const {email,otp}=VerifyOtpDto
    const user = await this.UserRepository.findOne({ where: { email } });

    if (!user || user.isEmailVerified) {
      throw new UnauthorizedException(
        'Invalid credentials or email already verified',
      );
    }

    if (user.otp !== otp || user.otpExpiration < new Date()) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    user.isEmailVerified = true;
    user.otp = null; // Clear OTP after successful verification
    user.otpExpiration = null;

    await this.UserRepository.save(user);
    return { success: true, message: 'Email successfully verified' };
  }
  async resendOtp(email: string): Promise<void> {
    const user = await this.UserRepository.findOne({ where: { email } });

    if (!user || user.isEmailVerified) {
      throw new UnauthorizedException(
        'Invalid credentials or email already verified',
      );
    }

    const otp = this.generateOtp();
    user.otp = otp;
    user.otpExpiration = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

    await this.UserRepository.save(user);
    await this.sendOtpEmail(user.email, otp);
  }

  async signIn(LoginAuthDto: LoginAuthDto): Promise<{accessToken: string; refreshToken: string;}> {
    const { email, password } = LoginAuthDto;
    const user = await this.validateUser(email, password);

    // Check if the user's email is verified
    // if (!user.isEmailVerified) {
    //   throw new UnauthorizedException('Email not verified');
    // } 
    
   

    // // Generate access token
    // const accessToken = await this.generateAccessToken(
    //   user.id,
    //   user.email,
    //   user.role,
    // );

    // return { accessToken };
    const tokens = await this.GenerateTokens
(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async validateUser(email: string, password: string): Promise<UserEntity> {
    const user = await this.UserRepository.findOne({ where: { email } });

    // Validate user existence and password
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }

    throw new UnauthorizedException('Please check your login credentials');
  }

  // private async generateAccessToken(
  //   userId: number,
  //   email: string,
  //   role: string,
  // ): Promise<string> {
  //   const payload = { sub: userId, email, role };

  //   const accessToken = this.JwtService.sign(payload);
  //   return accessToken;
  // }
  async GenerateTokens(userId: number, username: string, role: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.JwtService.signAsync(
        {
          sub: userId,
          username,
          role,
        },
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: '15m',
        },
      ),
      this.JwtService.signAsync(
        {
          sub: userId,
          username,
          role,
        },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        },
      ),
    ]);
    // console.log('acesstoken:' + accessToken, 'refreshtoken:' + refreshToken);
    return {
      accessToken,
      refreshToken,
    };
  }
  async updateRefreshToken(userId: number, refreshToken: string) {
    const salt = await bcrypt.genSalt();
    const hashedRefreshToken = await bcrypt.hash(refreshToken, salt);
    await this.UserRepository.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    const mailOptions = {
      from: process.env.NodeMailer_USER,
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}`,
    };

    try {
      await this.MailService.transporter.sendMail(mailOptions);
    } catch (error) {
      throw new InternalServerErrorException('Failed to send OTP email');
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    // Find the user by email
    const user = await this.UserRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate a password reset token
    const resetToken = uuidv4();
    user.resetToken = resetToken;
    user.resetTokenExpiration = new Date(Date.now() + 15 * 60 * 1000); // Token valid for 15 minutes

    // Save the user with updated reset token and expiration time
    await this.UserRepository.save(user);

    // Send the reset link to the user via email
    // const resetLink = `http://yourapp.com/reset-password?token=${resetToken}`;
    // const mailOptions = {
    //   from: process.env.NodeMailer_USER,
    //   to: email,
    //   subject: 'Password Reset Request',
    //   text: `Click the link to reset your password: ${resetLink}`,
    // };
    // 
    // Generate OTP
      const otp = this.generateOtp();

    try {
      // Send OTP email
      await this.sendOtpEmail(user.email, otp);
    } catch (error) {
      throw new InternalServerErrorException('Failed to send reset email');
    }
  }

  async resetPassword(resetToken: string, otp: string, newPassword: string): Promise<void> {
    // Find the user by reset token
    const user = await this.UserRepository.findOne({ where: { resetToken } });
  
    // Check if the user and the reset token are valid
    if (!user || user.resetTokenExpiration < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  
    // Check if the OTP is valid
    if (!user.otp || user.otp !== otp || user.otpExpiration < new Date()) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
  
    try {
      // Generate a salt and hash the new password
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(newPassword, salt);
  
      // Update the user entity
      user.password = hashedPassword;
      user.resetToken = null;
      user.resetTokenExpiration = null;
      user.otp = null;
      user.otpExpiration = null;
  
      // Save the updated user entity
      await this.UserRepository.save(user);
    } catch (error) {
      throw new InternalServerErrorException('Failed to reset password');
    }
  }
  async logout(userId: number): Promise<any> {
    return this.UserRepository.update(userId, { refreshToken: null });
  }



  async refreshTokens(userId: number, refreshToken: string) {
    const user = await this.UserRepository.findOne({ where: { id: userId } });
    if (!user || !user.refreshToken)
      throw new ForbiddenException('Access Denied');
    const refreshTokenMatches = await bcrypt.compare(
      user.refreshToken,
      refreshToken,
    );
    if (!refreshTokenMatches) throw new ForbiddenException('Access Denied');
    const tokens = await this.GenerateTokens(user.id, user.username,user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }
}
