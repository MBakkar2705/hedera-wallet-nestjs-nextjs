import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('token_transfer_entity')
export class TokenTransferEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fromAccountId: string;

  @Column()
  toAccountId: string;

  @Column()
  tokenId: string;

  @Column('integer')
  amount: number;

  @Column()
  transactionId: string;

  @CreateDateColumn()
  createdAt: Date;
}
