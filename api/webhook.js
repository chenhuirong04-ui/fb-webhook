export default async function handler(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === 'gciliving2026') {
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Forbidden');
    }
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;
    const entry = body.entry?.[0];
    const messaging = entry?.messaging?.[0];
    if (!messaging) return;

    const senderId = messaging.sender?.id;
    const text = messaging.message?.text;
    if (!text || !senderId) return;

    const NOTION_TOKEN = process.env.NOTION_TOKEN;
    const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    // 1. Write to Notion 待开发客户
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + NOTION_TOKEN,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: { database_id: '2d1d0b13b3b981bc968f000b2bc81ee7' },
        properties: {
          'Customer Name': { title: [{ text: { content: 'FB Messenger: ' + senderId } }] },
          '客户状态': { select: { name: '待开发' } },
          'BD阶段': { select: { name: '初次接触' } },
          'Notes（备注）': { rich_text: [{ text: { content: text } }] },
          '下次行动日期': { date: { start: tomorrowStr } }
        }
      })
    });

    // 2. Write to Follow-up Log
    await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + NOTION_TOKEN,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: { database_id: '2bfd0b13b3b9808ab007000bf779121c' },
        properties: {
          'title': { title: [{ text: { content: 'FB询盘: ' + senderId } }] },
          'Next Follow-up（下次跟进）': { date: { start: tomorrowStr } },
          'Follow-up Notes': { rich_text: [{ text: { content: text } }] }
        }
      })
    });

    // 3. Telegram notification
    await fetch('https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: '🔔 GCI Living 新FB询盘！\n来自：' + senderId + '\n消息：' + text + '\n✅ 已录入 Notion'
      })
    });

  } catch (err) {
    console.error('Error:', err);
  }
}
