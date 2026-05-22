const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const app = express();

app.use(express.json());

// ======================
// SERVER
// ======================

app.get('/', (req, res) => {
    res.send('Bot is alive');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});

// ======================
// TELEGRAM BOT
// ======================

const token = process.env.TOKEN;

const bot = new TelegramBot(token);

// ضع يوزر القناة هنا
const CHANNEL_ID = '@AnesthesiaQCoronary';

// ======================
// WEBHOOK
// ======================

const WEBHOOK_URL = `https://telegram-bot-onp.onrender.com/bot${token}`;

bot.setWebHook(WEBHOOK_URL);

app.post(`/bot${token}`, (req, res) => {

    bot.processUpdate(req.body);

    res.sendStatus(200);

});

// ======================
// TITLE DETECTION
// ======================

function extractTitle(text) {

    const match = text.match(
        /🔻🔻🔻🔻🔻🔻🔻\s*\n([\s\S]*?)\n🔻🔻🔻🔻🔻🔻🔻/
    );

    return match ? match[1].trim() : null;
}

// ======================
// DONE MESSAGE
// ======================

function isDoneMessage(text) {

    return text.trim() === '✅✅✅ تم بحمد الله ✅✅✅';

}

// ======================
// QUESTIONS EXTRACTION
// ======================

function extractQuestions(text) {

    const blocks = [];

    let current = [];

    const lines = text.split('\n');

    for (let line of lines) {

        if (/^\d+\.\s/.test(line.trim())) {

            if (current.length) {

                blocks.push(current.join('\n'));

            }

            current = [line];

        } else {

            if (current.length) {

                current.push(line);

            }

        }
    }

    if (current.length) {

        blocks.push(current.join('\n'));

    }

    return blocks;
}

// ======================
// MAIN HANDLER
// ======================

bot.on('message', async (msg) => {

    const text = msg.text;

    if (!text) return;

    // ======================
    // TITLE
    // ======================

    const title = extractTitle(text);

    if (title) {

        try {

            const sent = await bot.sendMessage(
                CHANNEL_ID,
                `🔻🔻🔻🔻🔻🔻🔻\n${title}\n🔻🔻🔻🔻🔻🔻🔻`
            );

            await bot.pinChatMessage(
                CHANNEL_ID,
                sent.message_id
            );

        } catch (err) {

            console.log('Title Error:', err.message);

        }
    }

    // ======================
    // DONE MESSAGE
    // ======================

    if (isDoneMessage(text)) {

        try {

            await bot.sendMessage(
                CHANNEL_ID,
                text
            );

        } catch (err) {

            console.log('Done Error:', err.message);

        }

        return;
    }

    // ======================
    // QUESTIONS
    // ======================

    const questions = extractQuestions(text);

    for (let q of questions) {

        const lines = q.split('\n');

        if (lines.length < 5) continue;

        const question = lines[0]
            .replace(/^\d+\.\s*/, '')
            .trim();

        let options = [];

        let correctIndex = -1;

        for (let i = 1; i <= 4; i++) {

            let option = lines[i];

            if (!option) continue;

            option = option
                .replace(/^[A-D]\)\s*/, '')
                .trim();

            if (option.includes('✅')) {

                correctIndex = i - 1;

                option = option
                    .replace('✅', '')
                    .trim();
            }

            options.push(option);
        }

        if (options.length !== 4) continue;

        if (correctIndex === -1) continue;

        try {

            await bot.sendPoll(
                CHANNEL_ID,
                question,
                options,
                {
                    type: 'quiz',
                    correct_option_id: correctIndex
                }
            );

        } catch (err) {

            console.log('Poll Error:', err.message);

        }
    }

});
