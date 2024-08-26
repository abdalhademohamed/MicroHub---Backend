import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { UserEntity } from "../user/entities/user.entity";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import { CreateUserDto } from "../user/dto/create-user.dto";
import { MailService } from "../user/utils/Email.Service";
import * as crypto from "crypto";
import { LoginAuthDto } from "./dto/login.auth.dto";
import { v4 as uuidv4 } from "uuid"; // For generating unique tokens
import { ConfigService } from "@nestjs/config";
import { I18nContext, I18nService } from "nestjs-i18n";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly UserRepository: Repository<UserEntity>,
    private JwtService: JwtService,
    private MailService: MailService,
    private configService: ConfigService,
    private readonly i18nService:I18nService
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
          throw new ConflictException("Email already exists");
        }
        if (existingUser.username === username) {
          throw new ConflictException("Username already exists");
        }
      }

      // Hash the password
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(password, salt);


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
      throw new InternalServerErrorException("Failed to sign up user");
    }
  }

  private generateOtp(): string {
    return crypto.randomBytes(3).toString("hex"); // Generates a 6-digit OTP
  }



  async signIn(
    LoginAuthDto: LoginAuthDto
  ): Promise<{ accessToken: string; refreshToken: string }> {

    const { email, password } = LoginAuthDto;
    const user = await this.validateUser(email, password);

    // Invalidate the previous refresh token
    await this.invalidateOldRefreshToken(user.id);
    // return { accessToken };
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    // Update the user's record with the new refresh token
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };

  }private async hashToken(token: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(token, salt);
  }
  
  
  async invalidateOldRefreshToken(userId: string): Promise<void> {
    // Fetch the user and check if there is an existing refresh token
    const user = await this.UserRepository.findOne({ where: { id: userId } });
  
    if (user && user.refreshToken) {
      // Invalidate the old refresh token, e.g., by deleting it or marking it as invalid
      await this.UserRepository.update(userId, { refreshToken: null });
    }
  }

  async validateUser(email: string, password: string): Promise<UserEntity> {
    const user = await this.UserRepository.findOne({ where: { email } });

    // Validate user existence and password
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }

    throw new UnauthorizedException("Please check your login credentials");
  }



  async sendOtpEmail(email: string, otp: string): Promise<void> {
    const mailOptions = {
      from: process.env.NodeMailer_USER,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is: ${otp}`,
    };

    try {
      await this.MailService.transporter.sendMail(mailOptions);
    } catch (error) {
     throw new InternalServerErrorException("Failed to send OTP email");

    }
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    // Find the user by email
    const user = await this.UserRepository.findOne({ where: { email } });
  
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
  
    // Generate OTP
    const otp = this.generateOtp();
  
    // Save the OTP and expiration time in the user entity
    user.otp = otp;
    user.otpExpiration = new Date(Date.now() + 15 * 60 * 1000); // OTP valid for 15 minutes
  
    try {
      // Save the user with the updated OTP and expiration time
      await this.UserRepository.save(user);
  
      // Send OTP email
      await this.sendOtpEmail(user.email, otp);
  
      // Return a success message
      return { message: "Please check your email for the OTP to reset your password." };
    } catch (error) {
      // Return a user-friendly message
      throw new InternalServerErrorException("Failed to send reset email. Please try again later.");
    }
  }
  async resetPassword(otp: string, newPassword: string): Promise<{ message: string }> {
    // Find the user by OTP
    const user = await this.UserRepository.findOne({ where: { otp } });
  
    // Check if the user exists and the OTP is valid
    if (!user || !user.otp || user.otp !== otp || new Date() > user.otpExpiration) {
      throw new UnauthorizedException("Invalid or expired OTP");
    }
  
    try {
      // Generate a salt and hash the new password
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(newPassword, salt);
  
      // Update the user entity
      user.password = hashedPassword;
      user.otp = null;
      user.otpExpiration = null;
  
      // Save the updated user entity
      await this.UserRepository.save(user);
  
      // Return a success message
      return { message: 'Password reset successful' };
    } catch (error) {
  
      // Return a user-friendly message
      throw new InternalServerErrorException('Failed to reset password. Please try again later.');
    }
  }
  async logout(userId: number): Promise<{ message: string }> {
    try {
      // Update the user's record to remove the refresh token
      const result = await this.UserRepository.update(userId, { refreshToken: null });
  
      if (result.affected === 0) {
        // If no rows were affected, it means the user was not found or the update failed
        // throw new NotFoundException('User not found'); 
        return this.i18nService.translate('test.NOT_FOUND');

        throw new NotFoundException('User not found'); 

      }
  
      // Return a success message
      return { message: 'Logout successful' };
    } catch (error) {
       
  
      // Return a user-friendly message without exposing internal details
      throw new InternalServerErrorException('Failed to logout. Please try again later.');
    }
  }
  async refreshTokens(userId: string, providedRefreshToken: string) {
  // Fetch user from the database by UUID
  const user = await this.UserRepository.findOne({ where: { id: userId } });

  if (!user || !user.refreshToken) {
    throw new ForbiddenException('Access Denied');
  }

  // Compare provided refresh token with the stored hash
  const refreshTokenMatches = await bcrypt.compare(providedRefreshToken, user.refreshToken);

  if (!refreshTokenMatches) {
    throw new ForbiddenException('Access Denied');
  }

  // Generate new tokens
  const tokens = await this.generateTokens(user.id, user.username, user.role);

  // Update refresh token in the database
  await this.updateRefreshToken(user.id, tokens.refreshToken);

  return tokens;
}

  
  private async generateTokens(userId: string, username: string, role: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.JwtService.signAsync(
        { sub: userId, username, role },
        { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
      ),
      this.JwtService.signAsync(
        { sub: userId, username, role },
        { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' },
      ),
    ]);

    return { accessToken, refreshToken };
  }
  private async updateRefreshToken(userId: string, refreshToken: string) {
    const salt = await bcrypt.genSalt();
    const hashedRefreshToken = await bcrypt.hash(refreshToken, salt);
    await this.UserRepository.update(userId, { refreshToken :hashedRefreshToken});
  }
}
