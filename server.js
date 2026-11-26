// Flop claim relay (Render free web service). Forwards a pre-signed agent-claims
// payload to the Flop testnet faucet from Render's egress IP, so a farm wallet
// whose signing key never leaves Luna VM can claim from a separate IP.
// Holds NO keys, NO mnemonic: it only relays {address, nonce, signature}.
// A shared token (env CLAIM_TOKEN, header x-claim-token) keeps random strangers
// from burning this egress IP's daily faucet quota.
const http = require('http');

const FAUCET = 'https://faucet.flop.network/v1/testnet/agent-claims';
const TOKEN = process.env.CLAIM_TOKEN || '';
const PORT = process.env.PORT || 10000;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 10000) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, service: 'flop-claim-relay' }));
    return;
  }
  if (req.method === 'POST' && req.url === '/claim') {
    if (TOKEN && req.headers['x-claim-token'] !== TOKEN) {
      res.writeHead(403);
      res.end(JSON.stringify({ ok: false, error: 'bad token' }));
      return;
    }
    try {
      const raw = await readBody(req);
      const payload = JSON.parse(raw);
      if (!payload.address || !payload.nonce || !payload.signature) {
        res.writeHead(400);
        res.end(JSON.stringify({ ok: false, error: 'need address, nonce, signature' }));
        return;
      }
      const up = await fetch(FAUCET, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: payload.address, nonce: payload.nonce, signature: payload.signature }),
        signal: AbortSignal.timeout(60000),
      });
      const text = await up.text();
      console.log(`claim address=${payload.address} nonce=${payload.nonce} faucet_http=${up.status} body=${text.slice(0, 500)}`);
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, faucet_http: up.status, faucet_body: text.slice(0, 2000) }));
    } catch (e) {
      console.log('claim ERR ' + (e && e.message || e));
      res.writeHead(502);
      res.end(JSON.stringify({ ok: false, error: String(e && e.message || e) }));
    }
    return;
  }
  res.writeHead(404);
  res.end(JSON.stringify({ ok: false, error: 'not found' }));
});

server.listen(PORT, () => console.log(`flop-claim-relay listening on ${PORT}`));
