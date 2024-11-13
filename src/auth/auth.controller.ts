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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  RequestPasswordResetDto,
  ResetPasswordDto,
} from "./dto/reset.pw.auth.dto";
import { RefreshTokenDto } from "./dto/refresh.token.dto";
import { RolesGuard } from "./guards/role.guards";
import { Roles } from "./Roles.decorator";
import { Role } from "../user/utils/user.enum";
import { AuthGuard } from "@nestjs/passport";
import { CreateAdminDto } from "./guards/create.admin.dto";
@ApiTags("auth")

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  @ApiOperation({ summary: "Sign up a new user" })
  @ApiResponse({
    status: 201,
    description: "User successfully created.",
    type: UserEntity,
  })
  @ApiResponse({
    status: 409,
    description: "Conflict: Email or username already exists.",
  })
  @ApiResponse({ status: 500, description: "Internal server error." })
  signUp(@Body() createUserDto: CreateUserDto): Promise<UserEntity> {
    return this.authService.signUp(createUserDto);
  }

  @Post("signin")
  @ApiOperation({
    summary: "Sign in a user and return access and refresh tokens",
  })
  @ApiResponse({
    status: 200,
    description: "Tokens successfully generated.",
    schema: { example: { accessToken: "string", refreshToken: "string" } },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized: Invalid credentials.",
  })
  @ApiResponse({ status: 500, description: "Internal server error." })
  async signIn(
    @Body() LoginAuthDto: LoginAuthDto,
  ): Promise<{ accessToken: string; refreshToken: string,userName:string}> {
    const { accessToken, refreshToken,userName } =
      await this.authService.signIn(LoginAuthDto);
    return { accessToken, refreshToken ,userName};
  }

  @UseGuards(AccessTokenGuard)
  @Post("logout")
  @ApiOperation({ summary: "Logout user by invalidating refresh token" })
  @ApiResponse({ status: 200, description: "User successfully logged out." })
  @ApiResponse({ status: 404, description: "User not found." })
  @ApiResponse({ status: 500, description: "Internal server error." })
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

  @Post("request/password/reset")
  @ApiOperation({ summary: "Request password reset" })
  @ApiBody({
    description: "Request password reset by providing email",
    type: RequestPasswordResetDto,
  })
  @ApiResponse({
    status: 200,
    description: "Password reset email sent successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid request or email not found",
  })
  @ApiResponse({
    status: 500,
    description: "Internal server error",
  })
  async requestPasswordReset(
    @Body() requestPasswordResetDto: RequestPasswordResetDto,
  ) {
    return await this.authService.requestPasswordReset(
      requestPasswordResetDto.email,
    );
  }

  @Get("verify/reset/token")
  @ApiOperation({ summary: "Verify password reset token" })
  @ApiQuery({
    name: "resettoken",
    type: String,
    description: "The reset token",
  })
  @ApiQuery({ name: "otp", type: String, description: "The OTP code" })
  @ApiResponse({
    status: 200,
    description: "Token and OTP verified successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid or expired token/OTP",
  })
  @ApiResponse({
    status: 404,
    description: "User not found",
  })
  @ApiResponse({
    status: 500,
    description: "Internal server error",
  })
  async verifyResetToken(
    @Query("resettoken") token: string,
    @Query("otp") otp: string,
  ): Promise<any> {
    return await this.authService.verifyResetToken(token, otp);
  }

  @Post("reset/password")
  @ApiOperation({ summary: "Reset password" })
  @ApiQuery({
    name: "resettoken",
    type: String,
    description: "The reset token",
  })
  @ApiBody({
    description: "New password to set",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Password has been changed and confirmation mail will be sent",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid token or password reset failed",
  })
  @ApiResponse({
    status: 404,
    description: "User not found",
  })
  @ApiResponse({
    status: 500,
    description: "Internal server error",
  })
  async resetPassword(
    @Query("resettoken") token: string,
    @Body("newPassword") newPassword: string,
  ): Promise<any> {
    // Verify the token  first
    const user = await this.authService.GetUserFromToken(token);
    await this.authService.resetPassword(user.id, newPassword);
    return {
      message: "password has been changed and comfirmation mail will be sent",
    };
  }

  @Post("refresh/token/:userId")
  @ApiOperation({ summary: "Refresh access and refresh tokens" })
  @ApiResponse({
    status: 200,
    description: "New tokens successfully generated.",
    schema: { example: { accessToken: "string", refreshToken: "string" } },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Invalid refresh token.",
  })
  @ApiResponse({ status: 500, description: "Internal server error." })
  async refreshTokens(
    @Param("userId") userId: string,
    @Body() refreshTokenDto: RefreshTokenDto,
    @Res() res,
  ): Promise<void> {
    const { refreshToken } = refreshTokenDto;

    try {
      const tokens = await this.authService.refreshTokens(userId, refreshToken);
      res.status(HttpStatus.OK).json(tokens);
    } catch (error) {
      res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        message:
          error.response?.message ||
          "Failed to refresh tokens. Please try again later.",
      });
    }
  }

  @Post('create/admin')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  async createAdminUser(
    @Request() req: any, // Request object to access the user

    @Body() createAdminDto: CreateAdminDto,
  ) {
    const userId = req.user.sub;
    
    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    return this.authService.createAdminUser(createAdminDto, userId);
  }
}
