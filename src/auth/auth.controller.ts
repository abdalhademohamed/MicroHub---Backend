import {
  Body,
  Controller,
  Get,
  Request,
  HttpStatus,
  Post,
  Req,
  UseGuards,
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
  @Post("request/password/reset")
  async requestPasswordReset(
    @Body() RequestPasswordResetDto: RequestPasswordResetDto
  ): Promise<{ message: string }> {
    const { email } = RequestPasswordResetDto;
    return this.authService.requestPasswordReset(email);
  }

  // Endpoint to reset the password
  @Post("reset/password")
  async resetPassword(
    @Body() ResetPasswordDto: ResetPasswordDto
  ): Promise<{ message: string }> {
    const { otp, newPassword } = ResetPasswordDto;
    return this.authService.resetPassword(otp, newPassword);
  }
}
