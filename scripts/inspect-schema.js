import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('--- Checking customer_orders schema ---');

    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: `
      select column_name, data_type 
      from information_schema.columns 
      where table_name = 'customer_orders' 
      order by ordinal_position;
    `
    });

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success - but exec_sql returns void, trying different approach...');
    }

    // Try direct query
    const { data: orders, error: ordersError } = await supabase
        .from('customer_orders')
        .select('*')
        .limit(1);

    if (ordersError) {
        console.error('Error selecting from customer_orders:', ordersError);
    } else if (orders && orders.length > 0) {
        console.log('\nCustomer Orders Columns:');
        Object.keys(orders[0]).forEach(col => console.log(`  - ${col}`));
    } else {
        console.log('No customer_orders found');
    }
}

main();
