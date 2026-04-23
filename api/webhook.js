export default function handler(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === 'gciliving2026') {
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Forbidden');
    }
  } else if (req.method === 'POST') {
    fetch('https://hook.eu1.make.com/jif8fjmlbexpp2nrkjbyc7lheswmeh4', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    }).catch(err => console.error(err));
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.status(405).send('Method Not Allowed');
  }
}
