import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UserEntity } from "../user/entities/user.entity";
import { Repository } from "typeorm";
import { ActionEntity } from "./entities/action.entity";
import { OrderEntity } from "../orders/entities/order.entity";
import { CreateActionDto } from "./dto/create.action.dto";

@Injectable()
export class ActionService {
    constructor(
        @InjectRepository(UserEntity)
        private readonly UserRepository: Repository<UserEntity>,
        @InjectRepository(ActionEntity)
        private readonly ActionRepository: Repository<ActionEntity>,
        @InjectRepository(OrderEntity)
        private readonly OrderRepository: Repository<OrderEntity>,
    ){}
    async createAction(body: CreateActionDto){
        const action = this.ActionRepository.create({
            action: body.action,
        })
        action.order = await this.OrderRepository.findOne({ where: { id: body.order } });
        action.createdBy = await this.UserRepository.findOne({ where: { id: body.createdBy } });
        action.createdAt = new Date();
        await this.ActionRepository.save(action);
        console.log(action);
    }
    async getAllActions(order: string) {
        const [actions, totalItems] = await this.ActionRepository.findAndCount({
            where: {
                order: {
                    id: order,
                },
            },
            relations: ["createdBy", "order"],
            order: { createdAt: "DESC" },
        })
        return { items: actions, totalItems };
    }
}