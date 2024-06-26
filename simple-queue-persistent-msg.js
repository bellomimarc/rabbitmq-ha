import 'dotenv/config'
import amqplib from 'amqplib';

// read first argument: can be 'send' or 'receive'
const mode = process.argv[2] || 'send';
// read second argument: number of messages to send if mode is 'send', or number of messages to receive if mode is 'receive'
const count = parseInt(process.argv[3] || '1', 10);

const buildRabbitUrl = ({ username, password, host, port }) => {
    return `amqp://${username}:${password}@${host}:${port}`;
};

const rabbitUri = buildRabbitUrl({
    username: process.env.RABBIT_USER,
    password: process.env.RABBIT_PASS,
    host: process.env.RABBIT_HOST,
    port: process.env.RABBIT_PORT,
});
const queue = 'test.simple-queue-persistent-msg';

const conn = await amqplib.connect(rabbitUri);
console.info('Connected to RabbitMQ');

const ch1 = await conn.createConfirmChannel();
await ch1.assertQueue(queue, { durable: true });
console.info('Queue created:', queue);

switch (mode) {
    case 'send':
        for (let i = 0; i < count; i++) {
            const b = ch1.sendToQueue(
                queue, 
                Buffer.from('something to do: ' + i), 
                { deliveryMode: 2 },
                function(err, ok) {
                    console.log('Message sent:', i, err, ok)
                }
            );
            if (!b) {
                console.error('Message not sent:', i);
                break;
            }
        }
        console.info('Sent', count, 'messages to', queue);
        break;
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