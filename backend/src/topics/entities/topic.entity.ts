import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class TopicEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  topicId: string;

  @Column({ nullable: true })
  memo?: string;

  @CreateDateColumn()
  createdAt: Date;
}
