import { UserRole } from '../enums/user-role.enum';

export interface Payload {
  sub: string;
  role: UserRole;
  restaurant_id?: string | null;
}
