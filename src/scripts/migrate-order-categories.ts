import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { MenuCategory } from '../common/enums/menu-category';

// Load environment variables
dotenv.config();

/**
 * Migration script to add category field to existing order items
 * Run with: npx ts-node src/scripts/migrate-order-categories.ts
 */
async function migrate() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quick-order';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const ordersCollection = db!.collection('orders');
        const menuItemsCollection = db!.collection('menuitems');

        console.log('Starting migration: Adding category to order items...');

        // Find all orders
        const orders = await ordersCollection.find({}).toArray();
        console.log(`Found ${orders.length} orders to process`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const order of orders) {
            let hasChanges = false;

            // Check each item in the order
            for (const item of order.items) {
                // If item doesn't have category, fetch it from menu
                if (!item.category) {
                    const menuItem = await menuItemsCollection.findOne({
                        _id: new mongoose.Types.ObjectId(item.menuItemId)
                    });

                    if (menuItem && menuItem.category) {
                        // Update item with category from menu
                        item.category = menuItem.category;
                        hasChanges = true;
                        console.log(`  - Updated item "${item.name}" with category: ${menuItem.category}`);
                    } else {
                        // Fallback to FOOD if menu item not found
                        item.category = MenuCategory.FOOD;
                        hasChanges = true;
                        console.log(`  - Set default category FOOD for item "${item.name}"`);
                    }
                }
            }

            // Save order if any changes were made
            if (hasChanges) {
                await ordersCollection.updateOne(
                    { _id: order._id },
                    { $set: { items: order.items } }
                );
                updatedCount++;
                console.log(`✓ Updated order ${order._id}`);
            } else {
                skippedCount++;
            }
        }

        console.log('\n=== Migration Complete ===');
        console.log(`Total orders: ${orders.length}`);
        console.log(`Updated: ${updatedCount}`);
        console.log(`Skipped (already had categories): ${skippedCount}`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
