import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UserEntity } from "../user/entities/user.entity";
import { Repository } from "typeorm";
import { ActionEntity } from "./entities/action.entity";
import { CreateActionDto } from "./dto/create.action.dto";
import { BranchEntity } from "../branch/entities/branch.entity";

@Injectable()
export class ActionService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly UserRepository: Repository<UserEntity>,
    @InjectRepository(ActionEntity)
    private readonly ActionRepository: Repository<ActionEntity>,
    @InjectRepository(BranchEntity)
    private readonly BranchRepository: Repository<BranchEntity>,
  ) {}
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
