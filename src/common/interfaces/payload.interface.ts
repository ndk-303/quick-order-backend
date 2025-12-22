import { UserRole } from '../enums/user-role.enum';

export interface Payload {
  sub: string;
  phoneNumber: string;
  role: UserRole;
}
