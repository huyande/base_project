import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user')
export class User {
  /** 主键ID */
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  /** 微信OpenID（唯一标识用户） */
  @Index({ unique: true })
  @Column({ name: 'open_id', length: 64 })
  openId: string;

  /** 用户昵称 */
  @Column({ name: 'nickname', length: 64, default: '' })
  nickname: string;

  /** 用户头像URL */
  @Column({ name: 'avatar_url', length: 255, default: '' })
  avatarUrl: string;

  /** 微信刷新令牌 */
  @Column({
    name: 'refresh_token',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  refreshToken: string | null;

  /** 令牌过期时间 */
  @Column({ name: 'token_expires_at', type: 'datetime', nullable: true })
  tokenExpiresAt: Date | null;

  /** 创建时间 */
  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  /** 更新时间 */
  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
