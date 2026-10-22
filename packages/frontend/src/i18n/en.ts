/**
 * English messages — the source of truth for every user-facing string.
 * Keys are flat `area.name`; `{param}` tokens are filled by `interpolate`.
 * Callers pre-format numbers and amounts before passing them in.
 */
export const en = {
  "app.documentTitle": "Red Sail Stakes",
  "app.titleMain": "Red Sail",
  "app.titleSub": "Stakes",
  "app.subtitle": "Send ships. Stake taels. Reap the bounty.",
  "app.footer":
    "Every voyage risks its whole stake. Lost stakes feed the treasury that pays the winners.",
  "app.language": "Language",

  "wallet.loading": "Loading...",
  "wallet.connect": "Connect Odin",
  "wallet.connecting": "Connecting...",
  "wallet.disconnect": "Disconnect",
  "wallet.error.untrustedOrigin":
    "This app's origin is not trusted by the game canister.",
  "wallet.error.popupClosed": "The Odin window was closed before signing in.",
  "wallet.error.cancelled": "Sign-in was cancelled.",
  "wallet.error.unverified": "Could not verify the sign-in. Please try again.",
  "wallet.error.failed": "Wallet connection failed",

  "treasury.title": "Treasury",
  "treasury.balance": "{amount} tl",
  "treasury.refresh": "Refresh balance",
  "treasury.buy": "Buy",
  "treasury.buying": "Buying...",
  "treasury.buy.refreshHint":
    "Purchase succeeded; refresh to see your balance.",
  "treasury.buy.cancelled": "Purchase was cancelled.",
  "treasury.buy.failed": "Purchase failed.",

  "pool.title": "House pool",
  "pool.available": "Available:",
  "pool.reserved": "Reserved:",
  "pool.atSea": "At sea:",
  "pool.owed": "Owed:",
  "pool.loading": "Loading…",
  "pool.hint":
    "Rewards are reserved from the available pool at launch; bigger voyages need a bigger pool.",
  "pool.amountPlaceholder": "Amount in tl",
  "pool.fund": "Fund",
  "pool.approving": "Approving...",
  "pool.depositing": "Depositing...",
  "pool.deposited": "Deposited {amount}. Pool now has {available} available.",
  "pool.error.approvalRejected": "Approval was rejected.",
  "pool.error.approvalFailed": "Approval failed.",
  "pool.error.noDelegation":
    "Approved, but the wallet session has no delegation. Reconnect and try again.",
  "pool.error.depositFailed": "Deposit failed",
  "pool.error.pullFailed":
    "The deposit could not be collected from your wallet. Check your balance and approval, then try again.",
  "pool.error.invalidAmount": "Enter a valid deposit amount.",

  "send.title": "Send a Ship",
  "send.stake": "Stake · {tier}",
  "send.voyage": "Voyage",
  "send.risk": "{pct} risk",
  "send.summary":
    "Returns {payout} on success; the whole stake is lost otherwise.",
  "send.fleet": "Fleet: {count}/{max}",
  "send.balance": "Balance: {amount}",
  "send.approving": "Approving...",
  "send.dispatching": "Dispatching...",
  "send.notConfigured": "Canister not configured",
  "send.loadingCharts": "Loading charts...",
  "send.fleetFull": "Fleet Full",
  "send.insufficient": "Insufficient Taels",
  "send.launch": "⚓ Launch Expedition",
  "send.error.approvalRejected": "Approval was rejected.",
  "send.error.approvalFailed": "Approval failed.",
  "send.error.noDelegation":
    "Approved, but the wallet session has no delegation to launch with. Reconnect and launch again.",

  "card.risk": "{pct} risk · +{reward}",
  "card.settingSail": "Setting sail…",
  "card.payoutPending": "Returned — payout pending",
  "card.complete": "Voyage complete!",
  "card.approvingFee": "Approving fee...",
  "card.returning": "Returning...",
  "card.launching": "Launching...",
  "card.rolling": "Rolling the dice...",
  "card.paying": "Paying out...",
  "card.claim": "Claim Payout",
  "card.return": "Return Ship",
  "card.error.feeRejected": "Fee approval was rejected.",
  "card.error.feeFailed": "Fee approval failed.",
  "card.error.noDelegation":
    "Approved, but the wallet session has no delegation. Reconnect and try again.",
  "card.error.transferFailed":
    "The ship made it back but the payout transfer failed. Press Claim Payout to retry.",

  "fleet.title": "Active Fleet ({count}/{max})",

  "toast.dispatched": "Ship Dispatched!",
  "toast.staked": "{amount} staked",
  "toast.returned": "Ship Returned!",
  "toast.lost": "Lost at Sea!",
  "toast.bounty": "{profit} bounty ({payout} returned)",
  "toast.sunk": "{stake} went down with the ship",

  "log.title": "Voyage Log",
  "log.viewAll": "View All",
  "log.showLess": "Show Less",

  "harbor.charting": "Charting the seas...",
  "harbor.empty": "No ships at sea... Launch an expedition!",

  "tier.coastal": "Coastal Trade",
  "tier.open_sea": "Open Sea",
  "tier.deep_ocean": "Deep Ocean",
  "tier.kraken_waters": "Kraken Waters",

  "wear.fresh": "fresh",
  "wear.weathered": "weathered",
  "wear.battered": "battered",
  "wear.derelict": "derelict",
  "ship.alt": "{wear} ship",
  "ship.altWithTier": "{tier} {wear} ship",

  "amount.tl": "🪙 {sign}{amount} tl",
  "duration.minutes": "{n}m",
  "duration.hours": "{n}h",
  "duration.days": "{n}d",
  "countdown.withDays": "{days}d {time}",

  "error.poolInsufficient":
    "The treasury cannot cover this voyage's reward yet. Try a smaller voyage or come back later.",
  "error.fleetFull": "Your fleet is full.",
  "error.paused": "Launches are paused right now.",
  "error.pullFailed":
    "The stake could not be collected from your wallet. Check your balance and approval, then try again.",
  "error.launchFailed": "Launch failed. Please try again.",
  "error.shipStillAtSea":
    "The ship is not back yet — the chain's clock runs a few seconds behind. Try again shortly.",
  "error.stillRolling":
    "The outcome is still being rolled. Refresh in a moment.",
  "error.payoutFailed":
    "Payout transfer failed. Check your BTC balance for the fee and press Claim Payout.",
  "error.returnFailed": "Return failed",
} satisfies Record<string, string>;
