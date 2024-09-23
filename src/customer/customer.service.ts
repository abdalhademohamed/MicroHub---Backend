import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { CreateCustomerDto } from "./dto/create.customer.dto";
import { UpdateCustomerDto } from "./dto/update.customer.dto";
import { CustomerEntity } from "./entities/customer.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { differenceInMilliseconds, formatDistanceToNow } from "date-fns";
import { GetCustomerDto } from "./dto/get.customer.dto";

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
  ) {}
  async getCustomerByPhoneNumber(phoneNumber: string): Promise<GetCustomerDto> {
    try {
      // Find the customer by phone number, including relations
      const customer = await this.customerRepository.findOne({
        where: { phoneNumber },
        relations: ["lastServices", "lastRootoshes"], // Include relations
      });

      // Handle case where customer is not found
      if (!customer) {
        throw new NotFoundException(
          `Customer with phone number ${phoneNumber} not found.`,
        );
      }

      // Convert dateOfBirth to a Date object if it's not already
      const dateOfBirth = new Date(customer.dateOfBirth);

      // Construct DTO
      const dto: GetCustomerDto = {
        id: customer.id,
        country_Code: customer.country_Code,
        phoneNumber: customer.phoneNumber,
        fullName: customer.fullName,
        dateOfBirth: customer.dateOfBirth ? dateOfBirth.toISOString() : null, // Ensure correct date format
        timeUntilBirthday: customer.dateOfBirth
          ? this.calculateTimeUntilBirthday(dateOfBirth)
          : null,
      };

      return dto;
    } catch (error) {
      // Log the detailed error information
      console.error("Error in getCustomerByPhoneNumber service method:", {
        message: error.message,
        stack: error.stack,
        phoneNumber,
      });

      // Handle specific errors
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Handle unexpected errors
      throw new InternalServerErrorException(
        "An unexpected error occurred while retrieving customer details.",
      );
    }
  }

  private calculateTimeUntilBirthday(dateOfBirth: Date): string | null {
    try {
      const today = new Date();
      const currentYear = today.getFullYear();

      // Extract month and day from the dateOfBirth
      const month = dateOfBirth.getMonth();
      const day = dateOfBirth.getDate();

      // Create a date object for the next birthday
      let nextBirthday = new Date(currentYear, month, day);

      // If the next birthday has already passed this year, calculate for next year
      if (nextBirthday < today) {
        nextBirthday = new Date(currentYear + 1, month, day);
      }

      // Calculate the distance between now and the next birthday
      return formatDistanceToNow(nextBirthday, { addSuffix: true });
    } catch (calcError) {
      // Log error during calculation
      console.error("Error calculating time until birthday:", calcError);
      return null; // Return null if there's an error in calculation
    }
  }
}
