import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('associations')
export class AssociationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  accountId: string;

  @Column()
  tokenId: string;

  @Column()
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
