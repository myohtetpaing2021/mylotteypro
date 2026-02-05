import { Logic } from './logic.js';
import { html } from './admin.html.js';

const USAGE_COST = 10;

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        // --- ADMIN ROUTES ---
        if (url.pathname === '/admin') {
            return new Response(html, { headers: { 'Content-Type': 'text/html' } });
        }

        // --- API ROUTES (Protected) ---
        if (url.pathname.startsWith('/api/')) {
            if (request.headers.get('X-Admin-Key') !== env.ADMIN_PASSWORD) {
                return new Response('Unauthorized', { status: 401 });
            }
            return handleApi(request, env, url);
        }

        // --- WEBHOOK ROUTE (Multi-Tenant) ---
        if (request.method === 'POST' && url.pathname.startsWith('/webhook/')) {
            const token = url.pathname.split('/')[2];
            return handleTelegramWebhook(request, env, token);
        }

        return new Response('2D3D SaaS System Operational.');
    }
};

async function handleApi(request, env, url) {
    const corsHeaders = {
      "Content-Type": "application/json"
    };

    if (url.pathname === '/api/clients') {
        try {
            const { results } = await env.DB.prepare("SELECT * FROM clients ORDER BY id DESC").all();
            return new Response(JSON.stringify({ clients: results }), { headers: corsHeaders });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
        }
    }

    if (url.pathname === '/api/create-client') {
        const { name, token } = await request.json();
        if (!name || !token) {
             return new Response(JSON.stringify({ error: "Name and Token required" }), { status: 400, headers: corsHeaders });
        }
        try {
            await env.DB.prepare("INSERT INTO clients (name, bot_token) VALUES (?, ?)").bind(name, token).run();
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (e) {
            // Check for unique constraint violation
            if (e.message.includes('UNIQUE')) {
                 return new Response(JSON.stringify({ error: "This Bot Token is already registered." }), { status: 400, headers: corsHeaders });
            }
            return new Response(JSON.stringify({ error: "Database Error: " + e.message }), { status: 500, headers: corsHeaders });
        }
    }
    
    if (url.pathname === '/api/topup') {
        const { id, amount } = await request.json();
        await env.DB.prepare("UPDATE clients SET credits = credits + ? WHERE id = ?").bind(amount, id).run();
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (url.pathname === '/api/commission') {
        const { id, rate } = await request.json();
        await env.DB.prepare("UPDATE clients SET commission_rate = ? WHERE id = ?").bind(rate, id).run();
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (url.pathname === '/api/webhook-link') {
        const { token } = await request.json();
        const workerUrl = new URL(request.url).origin;
        const webhookUrl = `${workerUrl}/webhook/${token}`;
        const tgRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
        return new Response(await tgRes.text(), { headers: corsHeaders });
    }

    if (url.pathname === '/api/broadcast') {
        const { message } = await request.json();
        const { results } = await env.DB.prepare("SELECT DISTINCT c.bot_token, a.telegram_user_id FROM authorized_users a JOIN clients c ON a.client_id = c.id").all();
        
        for (const row of results) {
            await sendMessage(row.bot_token, row.telegram_user_id, `📢 <b>System Message:</b>\n${message}`);
        }
        return new Response(JSON.stringify({ success: true, count: results.length }), { headers: corsHeaders });
    }
}

async function handleTelegramWebhook(request, env, token) {
    try {
        const update = await request.json();
        if (!update.message || !update.message.text) return new Response('OK');

        const chatId = update.message.chat.id;
        const userId = update.message.from.id;
        const text = update.message.text;

        const client = await env.DB.prepare("SELECT * FROM clients WHERE bot_token = ?").bind(token).first();
        if (!client) return new Response('Client Not Found', { status: 404 });
        
        if (!client.is_active) {
             await sendMessage(token, chatId, "🚫 Bot service is currently suspended.");
             return new Response('OK');
        }

        let authUser = await env.DB.prepare("SELECT * FROM authorized_users WHERE client_id = ?").bind(client.id).first();
        
        if (!authUser) {
            await env.DB.prepare("INSERT INTO authorized_users (client_id, telegram_user_id, username) VALUES (?, ?, ?)")
                .bind(client.id, userId, update.message.from.username || 'Unknown').run();
            await sendMessage(token, chatId, "🔒 Device Registered. You are now the owner of this bot.");
        } else if (authUser.telegram_user_id !== userId) {
            await sendMessage(token, chatId, "🚫 Unauthorized Access. This bot is locked to another user.");
            return new Response('OK');
        }

        if (text === '/start') {
            const msg = `👋 <b>2D3D Calculator Pro မှ ကြိုဆိုပါတယ်။</b>\n\n💰 လက်ကျန် Credit: <b>${client.credits}</b> Points\n💎 Usage Cost: <b>${USAGE_COST}</b> Points/Time\n\nသင်သည် Authorized User ဖြစ်ပါသည်။\n\n<b>အသုံးပြုပုံ:</b>\n/2d [စာရင်းများ] - 2D တွက်ရန်\n/3d [စာရင်းများ] - 3D တွက်ရန်\n/report - LOTTERY REPORT\n/balance - Check Credits`;
            await sendMessage(token, chatId, msg);
            return new Response('OK');
        }

        if (text === '/balance' || text === '/b') {
             await sendMessage(token, chatId, `💰 <b>Current Balance: ${client.credits} Points</b>`);
             return new Response('OK');
        }

        if (client.credits < USAGE_COST) {
            await sendMessage(token, chatId, "⚠️ <b>Insufficient Credits.</b>\nPlease contact admin to top-up.");
            return new Response('OK');
        }

        let responseText = null;
        let commandType = '';

        if (text.startsWith('/2d')) {
            const input = text.replace('/2d', '').trim();
            if(input) {
                responseText = Logic.calculate2D(input);
                commandType = '2D';
            } else responseText = "Please paste list after /2d";
        } 
        else if (text.startsWith('/3d')) {
            const input = text.replace('/3d', '').trim();
             if(input) {
                responseText = Logic.calculate3D(input);
                commandType = '3D';
             } else responseText = "Please paste list after /3d";
        }
        else if (text.startsWith('/report') || text.startsWith('/r')) {
            const input = text.replace(/\/report|\/r/g, '').trim();
             if(input) {
                responseText = Logic.calculateReport(input, client.commission_rate);
                commandType = 'REPORT';
             } else responseText = "Please paste list after /report";
        }

        if (responseText && commandType) {
            await env.DB.batch([
                env.DB.prepare("UPDATE clients SET credits = credits - ? WHERE id = ?").bind(USAGE_COST, client.id),
                env.DB.prepare("INSERT INTO usage_logs (client_id, telegram_user_id, command_type, cost) VALUES (?, ?, ?, ?)").bind(client.id, userId, commandType, USAGE_COST)
            ]);
            
            await sendMessage(token, chatId, responseText);
        } else if (responseText) {
            await sendMessage(token, chatId, responseText);
        }

    } catch (e) {
        console.error(e);
    }
    return new Response('OK');
}

async function sendMessage(token, chatId, text) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "HTML" }),
    });
}
