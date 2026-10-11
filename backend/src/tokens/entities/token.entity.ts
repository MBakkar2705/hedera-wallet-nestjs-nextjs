import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('tokens')
export class TokenEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tokenId: string;

  @Column()
  name: string;

  @Column()
  symbol: string;

  @Column()
  initialSupply: number;

  @CreateDateColumn()
  createdAt: Date;
}
