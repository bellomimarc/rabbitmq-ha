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
const queue = 'test.simple-queue';

const conn = await amqplib.connect(rabbitUri);
console.info('Connected to RabbitMQ');

const ch1 = await conn.createChannel();
await ch1.assertQueue(queue);
console.info('Queue created:', queue);

// Listener
ch1.consume(queue, (msg) => {
    if (msg !== null) {
        console.log('Received:', msg.content.toString());
        ch1.ack(msg);
    } else {
        console.log('Consumer cancelled by server');
    }
});
console.info('Listening to:', queue);

// Sender
const ch2 = await conn.createChannel();

setInterval(() => {
    ch2.sendToQueue(queue, Buffer.from('something to do'));
}, 1000);