import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FcmTokenEntity } from "./entities/fcm.token.entity";

@Injectable()
export class FcmTokenService {
  constructor(
    @InjectRepository(FcmTokenEntity)
    private readonly FcmTokenRepository: Repository<FcmTokenEntity>,
  ) {}

  async getTokenByUserId(userId: string): Promise<FcmTokenEntity | null> {
    return this.FcmTokenRepository.findOne({
      where: { user: { id: userId } },
    });
  }
  async saveToken(userId: string, token: string): Promise<FcmTokenEntity> {
    // console.log('Saving token', { userId, token });

    // Find existing token
    let fcmToken = await this.getTokenByUserId(userId);

    if (fcmToken) {
      // Update existing token
      fcmToken.token = token;
      fcmToken.expiration = this.calculateExpiration(); // Implement a method to calculate expiration if needed
    } else {
      // Create new token
      fcmToken = this.FcmTokenRepository.create({
        user: { id: userId },
        token,
      });
    }

    return this.FcmTokenRepository.save(fcmToken);
  }

  async deleteTokenByUserId(userId: string): Promise<void> {
    await this.FcmTokenRepository.delete({ id: userId });
  }

  private calculateExpiration(): Date {
    // Implement logic to calculate expiration date
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 1); // Example: Set expiration to 1 month from now
    return expirationDate;
  }

  async isTokenExpired(tokenId: string): Promise<boolean> {
    const token = await this.FcmTokenRepository.findOne({
      where: { id: tokenId },
    });

    if (!token) {
      throw new Error("Token not found");
    }

    const now = new Date();
    return token.expiration < now;
  }
}
