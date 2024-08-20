
import { Column, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Role } from "../utils/user.enum";


@Entity()
export class UserEntity{
    @PrimaryGeneratedColumn('uuid')
    id: number;

    @Column()
    username: string;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    

    @Column({ nullable: true })
    otp: string;

    @Column({ nullable: true })
    otpExpiration: Date;

    


    @Column({ nullable: true })
    refreshToken: string;
    @Column({
        type: 'enum',
        enum: Role,
        default: Role.ADMIN
    })
    role: Role;

    

    


}