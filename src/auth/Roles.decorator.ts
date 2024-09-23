import { SetMetadata } from "@nestjs/common";
import { Role } from "../user/utils/user.enum";

export const Roles = (...Roles: Role[]) => SetMetadata("roles", Roles);
