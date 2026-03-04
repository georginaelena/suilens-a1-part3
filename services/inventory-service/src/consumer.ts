import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5680';
const EXCHANGE = 'suilens.events';
const QUEUE = 'inventory.order-cancelled';
const ROUTING_KEY = 'order.cancelled';

async function consumeOrderCancelledEvents() {
  try {
    console.log('🔌 Connecting to RabbitMQ...');
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(QUEUE, { durable: true });
    await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);
    
    console.log(`📨 Listening for ${ROUTING_KEY} events on exchange ${EXCHANGE}...`);
    
    channel.consume(QUEUE, async (msg) => {
      if (!msg) return;
      
      try {
        const event = JSON.parse(msg.content.toString());
        console.log('📩 Received event:', event);
        
        // Extract data from event structure: { event: '...', timestamp: '...', data: {...} }
        const { orderId, lensId, branchCode } = event.data || event;
        
        if (!orderId) {
          console.error('❌ Missing orderId in event:', event);
          channel.ack(msg);
          return;
        }
        
        console.log(`Processing order.cancelled for orderId: ${orderId}`);
        
        // Call our own API to release stock (idempotent)
        const response = await fetch('http://localhost:4004/api/inventory/release', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Stock released for order:', orderId, result);
          channel.ack(msg);
        } else {
          const error = await response.json();
          console.error('❌ Failed to release stock:', error);
          // Negative acknowledge - will retry
          channel.nack(msg, false, true);
        }
      } catch (error) {
        console.error('❌ Error processing event:', error);
        channel.nack(msg, false, true);
      }
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Closing RabbitMQ connection...');
      await channel.close();
      await connection.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to connect to RabbitMQ:', error);
    setTimeout(consumeOrderCancelledEvents, 5000); // Retry after 5s
  }
}

// Start consuming
consumeOrderCancelledEvents();
