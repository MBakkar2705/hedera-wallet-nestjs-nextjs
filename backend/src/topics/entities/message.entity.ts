import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('messages')
export class MessageEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  topicId!: string;

  @Column()
  message!: string;

  @Column()
  transactionId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
