import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('accounts')
export class AccountEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  accountId!: string;

  @Column()
  publicKey!: string;

  @Column({ type: 'integer', default: 0 })
  initialBalance!: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
