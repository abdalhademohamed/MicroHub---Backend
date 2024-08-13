import { Entity, PrimaryGeneratedColumn, Column} from "typeorm";

export class Branch{
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    location: string;

    @Column()
    imageUrl: string;
}