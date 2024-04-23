import 'dotenv/config'
import amqplib from 'amqplib';

const buildRabbitUrl = ({ username, password, host, port }) => {
    return `amqp://${username}:${password}@${host}:${port}`;
};

const rabbitUri = buildRabbitUrl({
    username: process.env.RABBIT_USER,
    password: process.env.RABBIT_PASS,
    host: process.env.RABBIT_HOST,
    port: process.env.RABBIT_PORT,
});
const exchangeName = 'test.fanout-exchange';

const conn = await amqplib.connect(rabbitUri);
console.info('Connected to RabbitMQ');

const ch1 = await conn.createChannel();
await ch1.assertExchange(exchangeName, 'fanout', { durable: false });
console.info('Exchange created:', exchangeName);

// Listener
const q1 = await ch1.assertQueue('', { exclusive: true });
ch1.bindQueue(q1.queue, exchangeName, '');
ch1.consume(q1.queue, (msg) => {
    if (msg !== null) {
        console.log('ch1 Received:', msg.content.toString());
        ch1.ack(msg);
    } else {
        console.log('ch1 Consumer cancelled by server');
    }
});

//create another channel that consume the same exchange
const ch2 = await conn.createChannel();
const q2 = await ch2.assertQueue('', { exclusive: true });
ch2.bindQueue(q2.queue, exchangeName, '');
ch2.consume(q2.queue, (msg) => {
    if (msg !== null) {
        console.log('ch2 Received:', msg.content.toString());
        ch2.ack(msg);
    } else {
        console.log('ch2 Consumer cancelled by server');
    }
});

// Sender
const sender = await conn.createChannel();

setInterval(() => {
    sender.publish(exchangeName, "rk", Buffer.from('something to do from sender' + new Date().toISOString()));
}, 1000);