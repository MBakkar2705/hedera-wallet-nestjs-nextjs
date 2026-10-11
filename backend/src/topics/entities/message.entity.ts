import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('message_entity')
export class MessageEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  topicId: string;

  @Column()
  message: string;

  @Column()
  transactionId: string;

  @CreateDateColumn()
  createdAt: Date;
}
