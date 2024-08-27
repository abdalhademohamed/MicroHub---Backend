import {
  Body,
  Controller,
  Get,
  Request,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  Res,
  Query,
  Param,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";

import { CreateUserDto } from "../user/dto/create-user.dto";
import { UserEntity } from "../user/entities/user.entity";
import { LoginAuthDto } from "./dto/login.auth.dto";
import { AccessTokenGuard } from "./guards/accessToken.guard";
import { RefreshTokenGuard } from "./guards/refreshToken.guard";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  RequestPasswordResetDto,
  ResetPasswordDto,
} from "./dto/reset.pw.auth.dto";
import { RefreshTokenDto } from "./dto/refresh.token.dto";
@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  signUp(@Body() createUserDto: CreateUserDto): Promise<UserEntity> {
    return this.authService.signUp(createUserDto);
  }

  @Post("signin")
  async signIn(
    @Body() LoginAuthDto: LoginAuthDto
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { accessToken, refreshToken } =
      await this.authService.signIn(LoginAuthDto);
    return { accessToken, refreshToken };
  }

  @ApiOperation({
    summary: "Logout user",
    description: "Logs out the user by invalidating the access token",
  })
  @UseGuards(AccessTokenGuard)
  @Post("logout")
  logout(@Request() Req): any {
    return this.authService.logout(Req.user["sub"]);
  }

  // Endpoint to request a password reset
  // @Post("request/password/reset")
  // async requestPasswordReset(
  //   @Body() RequestPasswordResetDto: RequestPasswordResetDto
  // ): Promise<{ message: string }> {
  //   const { email } = RequestPasswordResetDto;
  //   return this.authService.requestPasswordReset(email);
  // }

  @Post('request/password/reset')
  async requestPasswordReset(@Body() requestPasswordResetDto: RequestPasswordResetDto) {
    return await this.authService.requestPasswordReset(requestPasswordResetDto.email);
  }



  @Get('verify/reset/token')
  async verifyResetToken(@Query('resettoken') token: string, @Query('otp') otp: string): Promise<any> {
    return await this.authService.verifyResetToken(token, otp);
  }
  

  @Post('reset/password')
  async resetPassword(
    @Query('resettoken') token: string,
    @Body('newPassword') newPassword: string
  ): Promise<any> {
    // Verify the token  first
    const user = await this.authService.GetUserFromToken(token);
    await this.authService.resetPassword(user.id, newPassword);
    return { message: 'password has been changed and comfirmation mail will be sent' };
  }


  @Post('refresh/token/:userId')
  async refreshTokens(
    @Param('userId') userId: string,
    @Body() refreshTokenDto: RefreshTokenDto,
    @Res() res
  ): Promise<void> {
    const { refreshToken } = refreshTokenDto;

    try {
      const tokens = await this.authService.refreshTokens(userId, refreshToken);
      res.status(HttpStatus.OK).json(tokens);
    } catch (error) {
      res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.response?.message || 'Failed to refresh tokens. Please try again later.',
      });
    }
  }
}
