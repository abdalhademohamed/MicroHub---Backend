import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { UserEntity } from "../user/entities/user.entity";
import { EntityManager, MoreThan, Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import { CreateUserDto } from "../user/dto/create-user.dto";
import { MailService } from "../user/utils/Email.Service";
import * as crypto from "crypto";
import { LoginAuthDto } from "./dto/login.auth.dto";
import { v4 as uuidv4 } from "uuid"; // For generating unique tokens
import { ConfigService } from "@nestjs/config";
import { I18nContext, I18nService } from "nestjs-i18n";
import { UserService } from "../user/user.service";
import { Role } from "../user/utils/user.enum";
import { CreateEmployeeDto } from "../employee/dto/create.employee.dto";
import { EmployeeEntity } from "../employee/entities/employee.entity";
import { BranchEntity } from "../branch/entities/branch.entity";
import { EmployeeTypeEntity } from "../employetype/entities/employetype.entity";
import { PositionEntity } from "../postion/entities/postion.entity";
import { Postion } from "../postion/utils/postion.enum";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";
import { SlotService } from "../slots/slots.service";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly UserRepository: Repository<UserEntity>,
    @InjectRepository(BranchEntity)
    private readonly BranchRepository: Repository<BranchEntity>,
    @InjectRepository(EmployeeTypeEntity)
    private readonly EmployeeTypeRepository: Repository<EmployeeTypeEntity>,
    @InjectRepository(EmployeeEntity)
    private readonly EmployeeRepository: Repository<EmployeeEntity>,
    @InjectRepository(PositionEntity)
    private readonly PositionRepository: Repository<PositionEntity>,

    private JwtService: JwtService,
    private MailService: MailService,
    private configService: ConfigService,
    private readonly i18nService: I18nService,
    private readonly entityManager: EntityManager,
    private readonly slotService: SlotService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async signUp(createUserDto: CreateUserDto): Promise<any> {
    const { username, email, password, role } = createUserDto;

    try {
      // Check for existing user
      const existingUser = await this.UserRepository.findOne({
        where: { email },
      });

      if (existingUser) {
        if (existingUser.email === email) {
          throw new ConflictException(
            this.i18nService.translate("test.EMAIL_EXISTS"),
          );
        }
        if (existingUser.username === username) {
          throw new ConflictException(
            this.i18nService.translate("test.USERNAME_EXISTS"),
          );
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
        otpExpiration: new Date(Date.now() + 10 * 60 * 1000), // OTP valid for 10 minutes
      });

      // Save user to database
      const newUser = await this.UserRepository.save(user);

      return newUser;
    } catch (error) {
      this.logger.error("Failed to sign up user", error.stack);

      if (error.code === "23505") {
        // Unique violation error code for PostgreSQL
        throw new ConflictException(
          this.i18nService.translate("test.EMAIL_EXISTS"),
        );
      }

      throw new InternalServerErrorException(
        this.i18nService.translate("test.SIGNUP_FAILED"),
      );
    }
  }

  async signIn(
    LoginAuthDto: LoginAuthDto,
  ): Promise<{ accessToken: string; refreshToken: string ;userName: string}> {
    const { email, password } = LoginAuthDto;
    const startTime = Date.now();

    try {
      // Validate user
      const user = await this.validateUser(email, password);
      console.log(`validateUser: ${Date.now() - startTime}ms`);

      try {
        // Invalidate the previous refresh token
        await this.invalidateOldRefreshToken(user.id);
        console.log(`invalidateOldRefreshToken: ${Date.now() - startTime}ms`);

        try {
          // Generate tokens
          const tokens = await this.generateTokens(
            user.id,
            user.username,
            user.email,
            user.role,
          );
          console.log(`generateTokens: ${Date.now() - startTime}ms`);

          try {
            // Update the user's record with the new refresh token
            await this.updateRefreshToken(user.id, tokens.refreshToken);
            console.log(`updateRefreshToken: ${Date.now() - startTime}ms`);

            // Return the generated tokens
            return {
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              userName:user.username
            }; 
          } catch (updateError) {
            console.error("Error updating refresh token:", updateError.message);
            throw new InternalServerErrorException(
              "Failed to update the refresh token. Please try again later.",
              updateError.stack,
            );
          }
        } catch (generateTokensError) {
          console.error(
            "Error generating tokens:",
            generateTokensError.message,
          );
          throw new InternalServerErrorException(
            "Failed to generate tokens. Please try again later.",
            generateTokensError.stack,
          );
        }
      } catch (invalidateTokenError) {
        console.error(
          "Error invalidating old refresh token:",
          invalidateTokenError.message,
        );
        throw new InternalServerErrorException(
          "Failed to invalidate the old refresh token. Please try again later.",
          invalidateTokenError.stack,
        );
      }
    } catch (validateUserError) {
      console.error("Error validating user:", validateUserError.message);
      throw new UnauthorizedException(
        "Invalid email or password. Please check your credentials and try again.",
        validateUserError.stack,
      );
    }
  }

  async invalidateOldRefreshToken(userId: string): Promise<void> {
    const startTime = Date.now();

    try {
      // Directly update the refreshToken field to null or an invalid state
      await this.UserRepository.update(userId, { refreshToken: null });

      console.log(`invalidateOldRefreshToken: ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error("Error invalidating old refresh token:", error.message);
      throw new InternalServerErrorException(
        "Failed to invalidate old refresh token. Please try again later.",
        error.stack,
      );
    }
  }

  async validateUser(email: string, password: string): Promise<UserEntity> {
    const user = await this.UserRepository.findOne({ where: { email } });

    // Validate user existence and password
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    throw new UnauthorizedException(
      this.i18nService.translate("test.INVALID_CREDENTIALS"),
    );

    // throw new UnauthorizedException("Please check your login credentials");
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
      throw new InternalServerErrorException(
        this.i18nService.translate("test.OTP_EMAIL_FAILED"),
      );

      //  throw new InternalServerErrorException("Failed to send OTP email");
    }
  }

  async requestPasswordReset(email: string): Promise<any> {
    const user = await this.UserRepository.findOne({ where: { email } });
    if (!user) {
      return; // Handle silently for security reasons
    }

    const otp = crypto.randomInt(100000, 999999).toString();

    const token = this.JwtService.sign(
      { userId: user.id, email: user.email, otp },
      { secret: process.env.JWT_RESET_SECRET, expiresIn: "15m" }, // Token expires in 15 minutes
    );
    const hashedToken = await bcrypt.hash(token, 10);
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    await this.UserRepository.save(user);

    const mailOptions = {
      from: process.env.NodeMailer_USER,
      to: user.email,
      subject: "Password Reset Request",
      text: `YOUR OTP Is :${otp}`,
    };
    try {
      await this.MailService.transporter.sendMail(mailOptions);
      return {
        message:
          "If your email is valid, you will receive a password reset link.",
        resetToken: token,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        this.i18nService.translate("test.RESET_EMAIL_FAILED"),
      );

      //  throw new InternalServerErrorException("Failed to send Password Reset Request email");
    }
  }
  async setResetPasswordToken(userId: string, token: string): Promise<void> {
    await this.UserRepository.update(userId, {
      resetPasswordToken: token,
      resetPasswordExpires: new Date(Date.now() + 3600000),
    }); // Token expires in 1 hour
  }

  async verifyResetToken(token: string, otp: string): Promise<UserEntity> {
    let decoded;

    // Verify and decode the JWT token
    try {
      decoded = this.JwtService.verify(token, {
        secret: process.env.JWT_RESET_SECRET,
      });
    } catch (error) {
      throw new BadRequestException("Invalid or expired token");
    }

    // Retrieve user by checking if the reset token is valid and not expired
    const user = await this.UserRepository.findOne({
      where: {
        id: decoded.userId,
        email: decoded.email,
        resetPasswordExpires: MoreThan(new Date()), // Ensure token is not expired
      },
    });

    // Check if the user exists and the provided OTP matches
    if (!user) {
      throw new NotFoundException(
        this.i18nService.translate("test.USER_NOT_FOUND"),
      );

      // throw new NotFoundException('User not found or token has expired');
    }

    // Compare the provided token with the hashed token stored in the database
    const isTokenValid = await bcrypt.compare(token, user.resetPasswordToken);
    if (!isTokenValid || decoded.otp !== otp) {
      throw new BadRequestException(
        this.i18nService.translate("test.INVALID_TOKEN_OR_OTP"),
      );

      // throw new BadRequestException('Invalid token or OTP');
    }

    return user;
  }

  async GetUserFromToken(token: string): Promise<UserEntity> {
    let decoded;

    // Verify and decode the JWT token
    try {
      decoded = this.JwtService.verify(token, {
        secret: process.env.JWT_RESET_SECRET,
      });
    } catch (error) {
      throw new BadRequestException(
        this.i18nService.translate("test.INVALID_TOKEN"),
      );

      // throw new BadRequestException('Invalid or expired token');
    }

    // Retrieve user by checking if the reset token is valid and not expired
    const user = await this.UserRepository.findOne({
      where: {
        id: decoded.userId,
        email: decoded.email,
        resetPasswordExpires: MoreThan(new Date()), // Ensure token is not expired
      },
    });

    // Check if the user exists and the provided OTP matches
    if (!user) {
      throw new NotFoundException(
        this.i18nService.translate("test.USER_NOT_FOUND"),
      );

      // throw new NotFoundException('User not found or token has expired');
    }

    // Compare the provided token with the hashed token stored in the database
    const isTokenValid = await bcrypt.compare(token, user.resetPasswordToken);
    if (!isTokenValid) {
      throw new BadRequestException(
        this.i18nService.translate("test.INVALID_TOKEN_OR_OTP"),
      );

      // throw new BadRequestException('Invalid token or OTP');
    }

    return user;
  }

  async resetPassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.UserRepository.update(userId, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    // Optionally, notify the user via email
    const user = await this.UserRepository.findOne({ where: { id: userId } });
    const mailOptions = {
      from: process.env.NodeMailer_USER,
      to: user.email,
      subject: "Password Reset Successful",
      text: `Password Reset Successful`,
    };

    try {
      await this.MailService.transporter.sendMail(mailOptions);
    } catch (error) {
      throw new InternalServerErrorException(
        this.i18nService.translate("test.CONFIRMATION_EMAIL_FAILED"),
      );

      //  throw new InternalServerErrorException("Failed to send confirmation email");
    }
  }

  async logout(userId: number): Promise<{ message: string }> {
    try {
      // Update the user's record to remove the refresh token
      const result = await this.UserRepository.update(userId, {
        refreshToken: null,
      });

      if (result.affected === 0) {
        // If no rows were affected, it means the user was not found or the update failed
        // throw new NotFoundException('User not found');
        // throw new NotFoundException( this.i18nService.translate('test.USER_NOT_FOUND'));
        throw new NotFoundException(
          this.i18nService.translate("test.USER_NOT_FOUND"),
        );
      }

      // Return a success message
      return { message: this.i18nService.translate("test.LOGOUT_SUCCESS") };
    } catch (error) {
      // Return a user-friendly message without exposing internal details
      throw new InternalServerErrorException(
        "Failed to logout. Please try again later.",
      );
    }
  }
  async refreshTokens(userId: string, providedRefreshToken: string) {
    // Fetch user from the database by UUID
    const user = await this.UserRepository.findOne({ where: { id: userId } });

    if (!user || !user.refreshToken) {
      throw new ForbiddenException("Access Denied");
    }

    // Compare provided refresh token with the stored hash
    const refreshTokenMatches = await bcrypt.compare(
      providedRefreshToken,
      user.refreshToken,
    );

    if (!refreshTokenMatches) {
      throw new ForbiddenException("Access Denied");
    }

    // Generate new tokens
    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.email,
      user.role,
    );

    // Update refresh token in the database
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async generateTokens(
    userId: string,
    username: string,
    email: string,
    role: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const startTime = Date.now();

    try {
      // Define token payload and options
      const payload = { sub: userId, username, email, role };
      const accessOptions = {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: "10h",
      };
      const refreshOptions = {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: "7d",
      };

      // Generate access and refresh tokens
      const accessToken = await this.JwtService.signAsync(
        payload,
        accessOptions,
      );
      const refreshToken = await this.JwtService.signAsync(
        payload,
        refreshOptions,
      );

      console.log(`generateTokens: ${Date.now() - startTime}ms`);

      return { accessToken, refreshToken };
    } catch (error) {
      console.error("Error generating tokens:", error.message);
      throw new InternalServerErrorException(
        "Failed to generate tokens. Please try again later.",
        error.stack,
      );
    }
  }
  async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const startTime = Date.now();

    // Update the user's refresh token
    await this.UserRepository.update(userId, { refreshToken });

    console.log(`updateRefreshToken: ${Date.now() - startTime}ms`);
  }

  async createEmployee(
    createEmployeeDto: CreateEmployeeDto,
    userId: string,
  ): Promise<any> {
    const {
      english_Name,
      arabic_Name,
      branchId,
      position: positionId,
      employeeType: employeeTypeId,
      workingHours,
      email,
      countryCode,
      phoneNumber,
      password,
      image,
      speciality
    } = createEmployeeDto;

    return await this.entityManager.transaction(
      async (transactionalEntityManager) => {
        try {
          // Hash the password
          const hashedPassword = await bcrypt.hash(password, 10);

          // Check if email exists
          await this.checkIfEmailExists(transactionalEntityManager, email);

          // Fetch branch, position, and employee type
          const branch = await this.getBranchById(
            transactionalEntityManager,
            branchId,
          );
          const position = await this.getPositionById(
            transactionalEntityManager,
            positionId,
          );
          const employeeType = await this.getEmployeeTypeById(
            transactionalEntityManager,
            employeeTypeId,
          );


          // Determine role based on position
          const role = this.determineRoleFromPosition(position);

          // Create and save user entity
          const savedUser = await this.createUser(transactionalEntityManager, {
            username: english_Name,
            email,
            password: hashedPassword,
            role,
          });

          // Create and save employee entity
          const newEmployee = this.EmployeeRepository.create({
            id: savedUser.id, // Use the same ID as the user
            english_Name,
            arabic_Name,
            branch,
            position,
            employeeType,
            workingHours,
            countryCode,
            phoneNumber,
            image,
            username: english_Name,
            email,
            password: hashedPassword,
            role,
            speciality
          });

          await transactionalEntityManager.save(EmployeeEntity, newEmployee);

          // Create an audit log entry
          const log = new AuditLogEntity();
          log.tableName = "employee"; // Use the table name
          log.action = "INSERT";
          log.entityId = newEmployee.id;
          log.performedBy = userId; // Set performedBy if available

          // Fetch user details if needed
          if (userId) {
            const user = await this.UserRepository.findOne({
              where: { id: userId },
            });
            if (user) {
              log.userDetails = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
              };
            }
          }

          await transactionalEntityManager.save(AuditLogEntity, log);
          if (newEmployee.role == Role.ARTIST) {
            // await this.slotService.createSlotsForArtist(newEmployee);
            this.eventEmitter.emit('artist:created', newEmployee);
          }
          return newEmployee;
        } catch (error) {
          console.error("Failed to create employee:", error);
          throw new InternalServerErrorException(
            "Failed to create employee",
            error.message,
          );
        }
      },
    );
  }

  private async checkIfEmailExists(
    entityManager: EntityManager,
    email: string,
  ): Promise<void> {
    const existingUser = await entityManager.findOne(UserEntity, {
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException("A user with this email already exists.");
    }
  }

  private async getBranchById(
    entityManager: EntityManager,
    branchId: string,
  ): Promise<BranchEntity> {
    const branch = await entityManager.findOne(BranchEntity, {
      where: { id: branchId },
    });
    if (!branch) {
      throw new NotFoundException("Branch not found");
    }
    return branch;
  }

  private async getPositionById(
    entityManager: EntityManager,
    positionId: string,
  ): Promise<PositionEntity> {
    const position = await entityManager.findOne(PositionEntity, {
      where: { id: positionId },
    });
    if (!position) {
      throw new NotFoundException("Position not found");
    }
    return position;
  }

  private async getEmployeeTypeById(
    entityManager: EntityManager,
    employeeTypeId: string,
  ): Promise<EmployeeTypeEntity> {
    const employeeType = await entityManager.findOne(EmployeeTypeEntity, {
      where: { id: employeeTypeId },
    });
    if (!employeeType) {
      throw new NotFoundException("Employee Type not found");
    }
    return employeeType;
  }

  private async createUser(
    entityManager: EntityManager,
    userData: Partial<UserEntity>,
  ): Promise<UserEntity> {
    const user = this.UserRepository.create(userData);
    return await entityManager.save(UserEntity, user);
  }
  private determineRoleFromPosition(position: PositionEntity): Role {
    // Example mapping logic based on the Postion enum
    switch (position.postion) {
      case Postion.ADMIN:
        return Role.ADMIN;
      case Postion.SUPERADMIN:
        return Role.SUPERADMIN;
      case Postion.BRANCHMANAGER:
        return Role.BRANCHMANAGER;
      case Postion.COORDINATOR:
        return Role.COORDINATOR;
      case Postion.RECEPTIONIST:
        return Role.RECEPTIONIST;
      case Postion.ACCOUNTANT:
        return Role.ACCOUNTANT;
      case Postion.ARTIST:
        return Role.ARTIST;
      case Postion.ARTISTMANAGER:
        return Role.ARTISTMANAGER;
      case Postion.TABLEMANAGER:
        return Role.TABLEMANAGER;
    }
  }
}