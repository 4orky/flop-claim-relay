# flop-claim-relay

A tiny relay that runs on Render's free tier. It forwards a **pre-signed**
Flop testnet `agent-claims` payload to the faucet from Render's egress IP,
so a farm wallet can claim from an IP that is separate from Luna VM,
the InstaBox cloud PC and the home PC.

- Holds **no keys, no mnemonic**. Signing happens on Luna VM
  (`sign-farm3.cjs`); only `{address, nonce, signature}` ever reaches here.
- `GET /` → health check. `POST /claim` with
  `{"address","nonce","signature"}` → forwards to
  `https://faucet.flop.network/v1/testnet/agent-claims` and returns the
  faucet's answer.
- Set env `CLAIM_TOKEN` on Render and send it as header `x-claim-token`
  so strangers can't burn this egress IP's daily faucet quota
  (3 grants/day per IP).
