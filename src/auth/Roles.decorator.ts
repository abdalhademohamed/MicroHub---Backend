import { SetMetadata } from "@nestjs/common";
import { Role } from "src/user/utils/user.enum";

export const Roles =(...Roles:Role[])=> SetMetadata('roles',Roles)