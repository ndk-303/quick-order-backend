import { BadRequestException } from '@nestjs/common';

export interface SelectedOption {
    name: string;
    price: number;
}

export interface MenuItemWithOptions {
    name: string;
    price: number;
    options?: Array<{
        options: Array<{
            name: string;
            price: number;
            isActive: boolean;
        }>;
    }>;
}

export interface OrderItemDto {
    quantity: number;
    selectedOptions?: SelectedOption[];
}

/**
 * Validates that the selectedOptions for a menu item are valid.
 * Checks: item supports options, no duplicates, each option exists and is active.
 */
export function validateMenuItemOptions(
    dbItem: MenuItemWithOptions,
    selectedOptions?: SelectedOption[],
): void {
    if (!selectedOptions || selectedOptions.length === 0) return;

    if (!dbItem.options || dbItem.options.length === 0) {
        throw new BadRequestException(
            `Món ăn "${dbItem.name}" không hỗ trợ tùy chọn`,
        );
    }

    // Check for duplicate option names
    const optionNames = selectedOptions.map((opt) => opt.name);
    if (new Set(optionNames).size !== optionNames.length) {
        throw new BadRequestException('Không được chọn trùng lặp tùy chọn');
    }

    // Validate each option exists and is active
    const availableOptions = dbItem.options.flatMap((config) => config.options);
    for (const selectedOpt of selectedOptions) {
        const matched = availableOptions.find(
            (opt) => opt.name === selectedOpt.name && opt.price === selectedOpt.price,
        );

        if (!matched) {
            throw new BadRequestException(
                `Tùy chọn "${selectedOpt.name}" không tồn tại cho món này`,
            );
        }

        if (!matched.isActive) {
            throw new BadRequestException(
                `Tùy chọn "${selectedOpt.name}" hiện không khả dụng`,
            );
        }
    }
}

/**
 * Calculates the total price for a single order/invoice item including options.
 * Returns optionsPrice and lineTotal.
 */
export function calculateItemTotal(
    basePrice: number,
    quantity: number,
    selectedOptions?: SelectedOption[],
): { optionsPrice: number; lineTotal: number } {
    const optionsPrice =
        selectedOptions?.reduce((sum, opt) => sum + opt.price, 0) ?? 0;
    const lineTotal = (basePrice + optionsPrice) * quantity;
    return { optionsPrice, lineTotal };
}
