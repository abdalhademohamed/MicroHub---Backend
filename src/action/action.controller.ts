import { Controller, Get, Param } from "@nestjs/common";
import { ActionService } from "./action.service";

@Controller('action')
export class ActionController {
    constructor(
        private readonly actionService: ActionService,
    ){}
    @Get(':action') 
    getAllActions(
        @Param('order') order: string,
    ) {
        return this.actionService.getAllActions(order);
    }
}