import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from 'src/common/enums/user-role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  // Authentication Identifiers
  @Prop({ required: false, unique: true, sparse: true })
  email?: string;

  @Prop({ required: false, unique: true, sparse: true })
  phoneNumber?: string;

  @Prop({ required: false, select: false })
  password?: string;

  // OAuth Provider IDs
  @Prop({ unique: true, sparse: true })
  googleId?: string;

  @Prop({ unique: true, sparse: true })
  facebookId?: string;

  // Meta Information
  @Prop({ type: [String], default: [] })
  authProviders: string[]; // ['phone', 'google', 'facebook']

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: false })
  address?: string;

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
