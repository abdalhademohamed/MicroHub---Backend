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
import { GetCustomerPaginatedsDto } from "./dto/get.customers.paginated.dto";
import { ReservationEntity } from "../reservation/entities/reservation.entity";

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
    @InjectRepository(ReservationEntity)
    private readonly ReservationRepository: Repository<ReservationEntity>,

  ) {}
  async getCustomerByPhoneNumber(phoneNumber: string): Promise<GetCustomerDto> {
    try {
      // Find the customer by phone number, including relations
      const customer = await this.customerRepository.findOne({
        where: { phoneNumber },
        relations: [
          "lastServices",
          "lastRootoshes",
          "reservations",
          "reservations.services",
          "orders",
        ],
      });

      // Handle case where customer is not found
      if (!customer) {
        throw new NotFoundException(
          `Customer with phone number ${phoneNumber} not found.`,
        );
      }

      // Convert dateOfBirth to a Date object if it's not already
      const dateOfBirth = customer.dateOfBirth
        ? new Date(customer.dateOfBirth)
        : null;

      // Helper function to format reservation date
      const formatReservationDate = (
        day: number,
        month: number,
        year: number,
      ): string => {
        const date = new Date(year, month - 1, day); // month is zero-based
        return date.toISOString();
      };

      // Calculate order count
      const orderCount = customer.orders?.length ?? 0;

      // Construct DTO
      const dto: GetCustomerDto = {
        id: customer.id,
        country_Code: customer.country_Code,
        phoneNumber: customer.phoneNumber,
        fullName: customer.fullName,
        dateOfBirth: dateOfBirth ? dateOfBirth.toISOString() : null, // Ensure correct date format
        timeUntilBirthday: dateOfBirth
          ? this.calculateTimeUntilBirthday(dateOfBirth)
          : null,
        lastServices: customer.lastServices?.map((service) => ({
          id: service.id,
          name: service.english_Name,
          duration: service.duration_Mins,
          price: service.price,
        })),
        lastRootoshes: customer.lastRootoshes?.map((rootosh) => ({
          id: rootosh.id,
          english_Name: rootosh.english_Name,
          arabic_Name: rootosh.arabic_Name,
          expirationDuration:rootosh.expireduration,
          expirationDate:customer.rootoshesexpirationDate,
          duration:rootosh.duration_Mins,
          description: rootosh.description,
       

        })),
        reservations: customer.reservations
        ?.slice(-10) // Get the last 10 reservations
        .map((reservation) => ({
          id: reservation.id,
          reservationDate: formatReservationDate(
            reservation.reservationDay,
            reservation.reservationMonth,
            reservation.reservationYear,
          ),
          services: reservation.services?.map((service) => ({
            id: service.id,
            name: service.english_Name,
            duration: service.duration_Mins,
            price: service.price,
          })),
        })),
       
        orderCount, // Count of orders
        rootoshesexpirationDate:customer.rootoshesexpirationDate
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

  async countCustomers(): Promise<number> {
    return await this.customerRepository.count();
  }
  async getAllCustomers(
    filters: GetCustomerPaginatedsDto,
  ): Promise<{ items: CustomerEntity[]; total: number }> {
    const { branchId, fromDate, toDate, page = 1, limit = 10 } = filters;
  
    // Step 1: Fetch customers
    const query = this.customerRepository.createQueryBuilder('customer');
  
    // Pagination
    query.skip((page - 1) * limit).take(limit);
  
    const [customers, total] = await query.getManyAndCount();
  
    // Step 2: Fetch reservation counts for each customer using a separate query
    const reservationCounts = await this.ReservationRepository
      .createQueryBuilder('reservation')
      .select('reservation.customerId', 'customerId')
      .addSelect('COUNT(reservation.id)', 'reservationCount')
      .groupBy('reservation.customerId')
      .getRawMany();
  
    // Step 3: Map reservation counts to each customer
    const items = customers.map(customer => {
      const count = reservationCounts.find(
        count => count.customerId === customer.id,
      );
      return {
        ...customer,
        reservationCount: count ? parseInt(count.reservationCount, 10) : 0,
      };
    });
  
    return { items, total };
  }
  
  
}

