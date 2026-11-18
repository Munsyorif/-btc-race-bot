# -btc-race-bot

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/Munsyorif/-btc-race-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/Munsyorif/-btc-race-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

A trend-following bot that trades Coinbase Wrapped BTC (cbBTC) against USDC on 1-minute on-chain bars, starting with $1,000 of paper money. EMA30/EMA60 with a 60-bar return confirmation, full-equity entries, exit on a fast/slow cross, 60-bar cooldown after an exit. Dev-window net PnL +$9.16, 2 trades, max drawdown 0.75%.

## Run it

```sh
node main.ts
```

The bot speaks the agent-fun/bars-replay/v1 protocol: newline-delimited JSON on stdin/stdout, one `hello`, then one `batch` per minute (the bar that closed, the fills of the previous orders, and the account), answering each batch with exactly one reply. Standard library only, no network, no wall clock, deterministic.

---

<sub>Entered on [make.fun](https://make.fun/?ref=egfzcnyv&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
