import 'dotenv/config'
import amqplib from 'amqplib';

// read first argument: can be 'send' or 'receive'
const mode = process.argv[2] || 'send';
// read second argument: number of messages to send if mode is 'send', or number of messages to receive if mode is 'receive'
const count = parseInt(process.argv[3] || '1', 10);
// read third argument: delivery mode
const deliveryMode = parseInt(process.argv[4] || '2', 10);

const buildRabbitUrl = ({ username, password, host, port }) => {
    return `amqp://${username}:${password}@${host}:${port}`;
};

const rabbitUri = buildRabbitUrl({
    username: process.env.RABBIT_USER,
    password: process.env.RABBIT_PASS,
    host: process.env.RABBIT_HOST,
    port: process.env.RABBIT_PORT,
});
const queue = 'test.quorum-queue';

const conn = await amqplib.connect(rabbitUri);
console.info('Connected to RabbitMQ');

const ch1 = await conn.createConfirmChannel();
await ch1.assertQueue(queue, { durable: true, arguments: {"x-queue-type" : "quorum"} });
console.info('Queue created:', queue);

async function sendToQueueAsync(ch, queue, message, options) {
    return new Promise((resolve, reject) => {
        const b = ch.sendToQueue(queue, message, options, (err, ok) => {
            if (err) {
                reject(err);
            } else {
                resolve(ok);
            }
        });

        if (!b) {
            reject(new Error('Message not sent'));
        }

    });
};

switch (mode) {
    case 'send':
        for (let i = 0; i < count; i++) {
            await sendToQueueAsync(
                ch1, 
                queue, 
                Buffer.from('something to do: ' + i), 
                { deliveryMode }
            );
        }
        console.info('Sent', count, 'messages to', queue);
        process.exit(0);
    case 'receive':
        ch1.prefetch(count);
        ch1.consume(queue, (msg) => {
            if (msg !== null) {
                console.log('Received:', msg.content.toString());
                ch1.ack(msg);
            } else {
                console.log('Consumer cancelled by server');
            }
        });
        console.info('Listening to:', queue);
        break;
    default:
        console.error('Invalid mode:', mode);
}