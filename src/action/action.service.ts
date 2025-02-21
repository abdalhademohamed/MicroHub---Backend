import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UserEntity } from "../user/entities/user.entity";
import { Repository } from "typeorm";
import { ActionEntity } from "./entities/action.entity";
import { CreateActionDto } from "./dto/create.action.dto";
import { BranchEntity } from "../branch/entities/branch.entity";
import { OrderEntity } from "src/orders/entities/order.entity";
import { FindOrdersDto } from "src/orders/dto/find.all.orders.dto";

@Injectable()
export class ActionService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly UserRepository: Repository<UserEntity>,
    @InjectRepository(ActionEntity)
    private readonly ActionRepository: Repository<ActionEntity>,
    @InjectRepository(BranchEntity)
    private readonly BranchRepository: Repository<BranchEntity>,
    @InjectRepository(OrderEntity)
    private readonly OrderRepository: Repository<OrderEntity>,
  ) {}
  async findAllOrdersCreatedByUser(
    findOrdersDto: FindOrdersDto,
    userId: string,
  ): Promise<{ items: OrderEntity[]; total: number }> {
    const {
      page,
      limit,
      fromDate,
      toDate,
      paymentStatus,
      orderStatus,
    } = findOrdersDto;

    try {

      const query = this.OrderRepository
        .createQueryBuilder("o")
        .leftJoinAndSelect("o.artist", "a")
        .leftJoinAndSelect("o.customer", "c")
        .addSelect(["c.id", "c.fullName", "c.phoneNumber"])
        .leftJoin("o.createdBy", "cb")
        .leftJoin("o.confirmedBy", "confirmedBy") // Include confirmedBy relation
        .addSelect([
          "confirmedBy.id",
          "confirmedBy.username",
          "confirmedBy.role",
        ])
        .addSelect(["cb.id", "cb.username", "cb.email", "cb.role"])
        .leftJoin("o.updatedBy", "ub")
        .addSelect(["ub.id", "ub.username"])
        .leftJoinAndSelect("o.reservation", "r")
        .leftJoinAndSelect("r.services", "s")
        .leftJoinAndSelect("r.rootoshes", "ro") // Adding the rootoshes join here
        .addSelect(["r.id", "r.start_Time", "r.end_Time", "r.totalPrice"])
        .andWhere('cb.id = :userId', { userId })
        .take(limit)
        .skip((page - 1) * limit)

      if (fromDate || toDate) {
        if (fromDate) {
          query.andWhere("o.date >= :fromDate", {
            fromDate: new Date(fromDate).toISOString(),
          });
        }
        if (toDate) {
          query.andWhere("o.date < :toDate", {
            toDate: new Date(toDate).toISOString(),
          });
        }
      }

      if (paymentStatus) {
        query.andWhere("o.paymentStatus = :paymentStatus", { paymentStatus });
      }

      // Handle multiple order statuses
      if (orderStatus && orderStatus.length > 0) {
        query.andWhere("o.status IN (:...orderStatus)", { orderStatus });
      }

      const [items, total] = await query.getManyAndCount();

      return { items, total };
    } catch (error) {
      console.error("Error fetching orders:", error);
      throw new BadRequestException("Unable to fetch orders.");
    }
  }

  async createAction(body: CreateActionDto) {
    const action = this.ActionRepository.create({
      actionAr: body.actionAr,
      actionEn: body.actionEn,
    });
    action.order = body.order;
    action.createdBy = await this.UserRepository.findOne({
      where: { id: body.createdBy },
    });
    action.branch = await this.BranchRepository.findOne({
      where: { id: body.branch },
    });
    action.createdAt = new Date();
    console.log(action);
    await this.ActionRepository.save(action);
  }
  async getAllActions(orderId: string) {
    console.log(orderId);
    const queryBuilder = this.ActionRepository.createQueryBuilder("action")
      .leftJoinAndSelect("action.createdBy", "createdBy")
      .leftJoinAndSelect("action.branch", "branch")
      .where("action.order = :orderId", { orderId })
      .orderBy("action.createdAt", "DESC");

    const [actions, totalItems] = await queryBuilder.getManyAndCount();

    return { items: actions, totalItems };
  }
}
