import { MenuCategory } from '../enums/menu-category';
import { Types } from 'mongoose';

/**
 * Strongly-typed MongoDB query object for menu item filtering.
 */
export interface MenuQuery {
    restaurant: Types.ObjectId;
    isAvailable?: boolean;
    category?: MenuCategory;
    price?: {
        $gte?: number;
        $lte?: number;
    };
    name?: {
        $regex: string;
        $options: string;
    };
}

/**
 * VNPAY request params — all values are URL-encoded strings per VNPAY spec.
 */
export type VnpayParams = Record<string, string>;
