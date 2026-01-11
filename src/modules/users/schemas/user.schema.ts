import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from 'src/common/enums/user-role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  phoneNumber: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: false })
  address: string;

  @Prop({ required: true, enum: UserRole, default: UserRole.CLIENT })
  role: UserRole;

  @Prop({ select: false })
  refreshToken?: string;

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Restaurant', required: false })
  restaurantId?: Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);
