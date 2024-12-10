import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UserEntity } from "../user/entities/user.entity";
import { Repository } from "typeorm";
import { ActionEntity } from "./entities/action.entity";
import { OrderEntity } from "../orders/entities/order.entity";
import { CreateActionDto } from "./dto/create.action.dto";
import { BranchEntity } from "src/branch/entities/branch.entity";

@Injectable()
export class ActionService {
    constructor(
        @InjectRepository(UserEntity)
        private readonly UserRepository: Repository<UserEntity>,
        @InjectRepository(ActionEntity)
        private readonly ActionRepository: Repository<ActionEntity>,
        @InjectRepository(OrderEntity)
        private readonly OrderRepository: Repository<OrderEntity>,
        @InjectRepository(BranchEntity)
        private readonly BranchRepository: Repository<BranchEntity>,
    ){}
    async createAction(body: CreateActionDto){
        const action = this.ActionRepository.create({
            actionAr: body.actionAr,
            actionEn: body.actionEn,
        })
        action.order = await this.OrderRepository.findOne({ where: { id: body.order } });
        action.createdBy = await this.UserRepository.findOne({ where: { id: body.createdBy } });
        action.branch = await this.BranchRepository.findOne({ where: { id: body.branch } });
        action.createdAt = new Date();
        await this.ActionRepository.save(action);
    }
    async getAllActions(order: string) {
        const [actions, totalItems] = await this.ActionRepository.findAndCount({
            where: {
                order: {
                    id: order,
                },
            },
            relations: ["createdBy", "order", "branch"],
            order: { createdAt: "DESC" },
        })
        return { items: actions, totalItems };
    }
}