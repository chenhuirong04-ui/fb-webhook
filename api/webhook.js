export default async function handler(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === 'gciliving2026') {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // Always respond 200 immediately to Facebook
  res.status(200).send('EVENT_RECEIVED');

  try {
    // Parse body - Vercel auto-parses JSON
    const body = req.body || {};
    console.log('FB Webhook received:', JSON.stringify(body).substring(0, 500));

    const entry = body.entry?.[0];
    if (!entry) return;

    // Handle page messaging
    const messaging = entry.messaging?.[0];
    if (!messaging) return;

    const senderId = messaging.sender?.id;
    const text = messaging.message?.text;

    console.log('senderId:', senderId, 'text:', text);

    if (!text || !senderId) return;

    const NOTION_TOKEN = process.env.NOTION_TOKEN;

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Write to Notion 待开发客户
    const notionRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + NOTION_TOKEN,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: { database_id: '2d1d0b13b3b981bc968f000b2bc81ee7' },
        properties: {
          'Customer Name': { title: [{ text: { content: 'FB询盘: ' + senderId } }] },
          '客户状态': { select: { name: '待开发' } },
          'BD阶段': { select: { name: '初次接触' } },
          'Notes（备注）': { rich_text: [{ text: { content: text.substring(0, 500) } }] },
          '下次行动日期': { date: { start: tomorrowStr } }
        }
      })
    });

    const notionData = await notionRes.json();
    console.log('Notion result:', notionRes.status, notionData.id || notionData.message);

    // Telegram notification
    const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    if (TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
      await fetch('https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: '🔔 GCIliving 新FB询盘！\n来自: ' + senderId + '\n消息: ' + text + '\n✅ 已录入 Notion'
        })
      });
    }

  } catch (err) {
    console.error('Webhook error:', err.message);
  }
}
