import {
  Body,
  Controller,
  Get,
  Request,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';

import { CreateUserDto } from '../user/dto/create-user.dto';
import { UserEntity } from '../user/entities/user.entity';
import { LoginAuthDto } from './dto/login.auth.dto';
import { AccessTokenGuard } from './guards/accessToken.guard';
import { RefreshTokenGuard } from './guards/refreshToken.guard';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VerifyOtpDto } from './dto/verify.otp.dto';
import { RequestPasswordResetDto, ResetPasswordDto } from './dto/reset.pw.auth.dto';
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signUp(@Body() createUserDto: CreateUserDto): Promise<UserEntity> {
    return this.authService.signUp(createUserDto);
  }




  // @ApiResponse({ status: 201, description: 'OTP verified successfully.' })
  // @ApiResponse({ status: 400, description: 'Invalid OTP.' })
  @Post('verify/otp')
  verifyOtp(
    @Body() VerifyOtpDto: VerifyOtpDto
  ): Promise<void> {
    return this.authService.verifyOtp(VerifyOtpDto);
  }


  @ApiBody({
    description: 'Request payload to resend OTP',
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'The email of the user requesting OTP resend',
          example: 'user@example.com',
        },
      },
      required: ['email'],
    },
  })
  @Post('resend/otp')
  async resendotp(@Body('email') email: string): Promise<any> {
    return await this.authService.resendOtp(email);
  }







  @Post('signin')
  async signIn(
    @Body() LoginAuthDto: LoginAuthDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { accessToken, refreshToken } =
      await this.authService.signIn(LoginAuthDto);
    return { accessToken, refreshToken };
  }




  // @ApiBody({
  //   description: 'Request payload to reset password',
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       email: {
  //         type: 'string',
  //         description: 'The email of the user requesting a password reset',
  //         example: 'user@example.com',
  //       },
  //     },
  //     required: ['email'],
  //   },
  // })
  // @Post('request/pw/reset')
  // resetpassword(@Body('email') email: string): Promise<void> {
  //   return this.authService.requestPasswordReset(email);
  // }



  @ApiOperation({
    summary: 'Logout user',
    description: 'Logs out the user by invalidating the access token',
  })
  @UseGuards(AccessTokenGuard)
  @Get('logout')
  logout(@Request() Req): any {
    this.authService.logout(Req.user['sub']);
  }




  //  @ApiOperation({
  //   summary: 'Refresh access token',
  //   description: 'Refreshes the access token using the provided refresh token',
  // })
  // @UseGuards(RefreshTokenGuard)
  // @Get('refresh/token')
  // refreshTokens(@Request() Req) {
  //   const userId = Req.user['sub'];
  //   const refreshToken = Req.user['refreshToken'];
  //   return this.authService.refreshTokens(userId, refreshToken);
  // }


   // Endpoint to request a password reset
   @Post('request/password/reset')
   async requestPasswordReset(@Body() RequestPasswordResetDto: RequestPasswordResetDto): Promise<void> {
     const { email } = RequestPasswordResetDto;
     return this.authService.requestPasswordReset(email);
   }
 
   // Endpoint to reset the password
   @Post('reset/password')
   async resetPassword(@Body() ResetPasswordDto: ResetPasswordDto): Promise<void> {
     const { resetToken, otp, newPassword } = ResetPasswordDto;
     return this.authService.resetPassword(resetToken, otp, newPassword);
   }
}
