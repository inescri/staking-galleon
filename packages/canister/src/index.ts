import {
  call,
  canisterSelf,
  IDL,
  init,
  msgCaller,
  query,
  StableBTreeMap,
  time,
  update,
} from "azle";
import { Principal } from "@dfinity/principal";

import {
  DifficultyIdl,
  GameConfigIdl,
  InitArgsIdl,
  PoolStatsIdl,
  ResultIdl,
  SettleOutcomeIdl,
  ShipIdl,
  ShipStatusIdl,
  TrustedOriginsIdl,
  fromCandidConfig,
  fromCandidDifficulty,
  fromCandidShipStatus,
  toCandidConfig,
  toCandidShip,
  type CandidDifficulty,
  type CandidGameConfig,
  type CandidShip,
  type CandidShipStatus,
  type InitArgs,
  type Result,
  type SettleOutcome,
} from "./candid";
import { DEFAULT_CONFIG } from "./default_config";
import {
  ERR,
  STUCK_SETTLE_MS,
  ZERO_POOL,
  applyFund,
  applyLaunchConfirmed,
  applyPaid,
  applyReserve,
  applyReserveRelease,
  applySettleLost,
  applySettleWon,
  applyWithdraw,
  canClaim,
  canReserve,
  canSettle,
  computeReward,
  countAtSea,
  decideOutcome,
  findDifficulty,
  isPristine,
  isRecoveryTransition,
  poolTotal,
  rollBps,
  trimOwnerIndex,
  validateAmount,
  validateConfig,
  type Difficulty,
  type GameConfig,
  type PoolState,
  type Ship,
  type ShipStatus,
} from "./game";
import {
  ODIN_BTC_FEE,
  ODIN_BTC_TOKEN_ID,
  odinPullToken,
  odinSendToken,
} from "./odin";

const VERSION = "galleon-stakes 0.1.0 (schema 1)";

/**
 * ⚠️ EDIT BEFORE DEPLOY — must list the exact origin(s) the frontend is served
 * from, or Odin Connect login fails with "origin is not trusted".
 *
 * ICRC-28 trusted origins: the web origins allowed to request signed calls to
 * this canister on a user's behalf. Each entry is a bare origin
 * `scheme://host[:port]`, no trailing slash. https only, except localhost.
 */
const TRUSTED_ORIGINS: string[] = [
  "http://localhost:5173",
  "http://localhost:5174",
  // Production — Netlify-hosted frontend.
  "https://galleon-expeditions.netlify.app",
];

/** Settled ship ids kept per owner (ships at sea are always kept). */
const OWNER_INDEX_KEEP = 100;
/** Attempts at `raw_rand` before giving up on a settle. */
const RAND_ATTEMPTS = 4;

const MANAGEMENT_CANISTER = Principal.fromText("aaaaa-aa");

function nowMs(): bigint {
  return time() / 1_000_000n;
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error, (_k, v) =>
      typeof v === "bigint" ? v.toString() : v,
    );
  } catch {
    return String(error);
  }
}

/**
 * Red Sail Stakes — voyage staking game canister.
 *
 * A player launches a ship by staking a fixed amount for one of the
 * configured difficulties and durations. When the voyage ends the owner
 * settles it: an on-chain roll (`raw_rand`) decides whether the ship returns
 * with stake + reward or is lost, in which case the stake joins the house
 * pool that funds future rewards. Every reward is reserved from the pool at
 * launch, so a won payout is always backed.
 *
 * Money flow (all on the Odin ledger, see odin.ts):
 *   launch     — pulls the stake via icrc2_transfer_from (player pre-approves)
 *   settle/claim — on a win, pulls the BTC ledger fee from the winner, then
 *                  sends stake + reward back (icrc1_transfer)
 *   fund_pool  — pulls tokens into the pool (anyone; admin seeds it)
 *   withdraw_pool — admin takes free pool money out
 *
 * ⚠️ AI-GUARD: every update that awaits a cross-canister call persists its
 * state change BEFORE the await (status locks, pool reservations) and reverts
 * explicitly on failure. Azle processes other messages at await points; do
 * not reorder an effect after its interaction.
 */
export default class {
  /** Canister-wide settings. Memory id 0. */
  meta = new StableBTreeMap<string, string>(0);
  /** Game config under key 'config'. Memory id 1. */
  gameConfig = new StableBTreeMap<string, GameConfig>(1);
  /** Every ship ever launched, by id. Memory id 2. */
  ships = new StableBTreeMap<bigint, Ship>(2);
  /** Owner principal text → ship ids. Memory id 3. */
  shipsByOwner = new StableBTreeMap<string, bigint[]>(3);
  /** House pool under key 'pool'. Memory id 4. */
  pool = new StableBTreeMap<string, PoolState>(4);
  /** Monotonic counters. Memory id 5. */
  counters = new StableBTreeMap<string, bigint>(5);

  @init([InitArgsIdl])
  initialize(args: InitArgs): void {
    this.meta.insert("owner", msgCaller().toText());
    this.meta.insert("ledger_id", args.ledger_id.toText());
    this.meta.insert("token_id", args.token_id);
    this.meta.insert("schema_version", "1");
    this.meta.insert("paused", "0");
    this.gameConfig.insert("config", DEFAULT_CONFIG);
    this.pool.insert("pool", ZERO_POOL);
  }

  // ── Internal accessors (all fall back to defaults for upgrade safety) ──

  private ledger(): Principal {
    const text = this.meta.get("ledger_id");
    if (text === undefined) throw new Error("ledger_id not configured");
    return Principal.fromText(text);
  }

  private tokenId(): string {
    const id = this.meta.get("token_id");
    if (id === undefined) throw new Error("token_id not configured");
    return id;
  }

  private isAdmin(caller: Principal): boolean {
    return this.meta.get("owner") === caller.toText();
  }

  private isPaused(): boolean {
    return this.meta.get("paused") === "1";
  }

  private getConfig(): GameConfig {
    return this.gameConfig.get("config") ?? DEFAULT_CONFIG;
  }

  private getPool(): PoolState {
    return this.pool.get("pool") ?? ZERO_POOL;
  }

  private putPool(pool: PoolState): void {
    this.pool.insert("pool", pool);
  }

  private bump(counter: string): void {
    this.counters.insert(counter, (this.counters.get(counter) ?? 0n) + 1n);
  }

  private putShip(ship: Ship): void {
    this.ships.insert(ship.id, ship);
  }

  private setStatus(ship: Ship, status: ShipStatus): Ship {
    const next = { ...ship, status, statusChangedAt: nowMs() };
    this.putShip(next);
    return next;
  }

  private ownerShips(owner: string): Ship[] {
    const ids = this.shipsByOwner.get(owner) ?? [];
    const result: Ship[] = [];
    for (const id of ids) {
      const ship = this.ships.get(id);
      if (ship !== undefined) result.push(ship);
    }
    return result;
  }

  private candidShips(owner: string): CandidShip[] {
    return this.ownerShips(owner).map((s) =>
      toCandidShip(s, (t) => Principal.fromText(t)),
    );
  }

  // ── Player endpoints ─────────────────────────────────────────────────

  /**
   * Stake the configured amount for `difficulty` on its `durationIndex`-th
   * duration. The caller must first approve this canister (ICRC-2) for the
   * difficulty's stake on the Odin ledger.
   *
   * ⚠️ AI-GUARD ordering: the placeholder ship and the reward reservation are
   * persisted BEFORE the stake pull so concurrent launches see the fleet cap
   * and the reduced pool; both are reverted if the pull fails.
   */
  @update([DifficultyIdl, IDL.Nat8], ResultIdl(IDL.Nat64))
  async launch(
    difficultyVariant: CandidDifficulty,
    durationIndex: number,
  ): Promise<Result<bigint>> {
    const caller = msgCaller();
    if (caller.isAnonymous()) return { Err: ERR.ANONYMOUS };
    if (this.isPaused()) return { Err: ERR.PAUSED };

    let difficulty: Difficulty;
    try {
      difficulty = fromCandidDifficulty(difficultyVariant);
    } catch {
      return { Err: ERR.UNKNOWN_DIFFICULTY };
    }
    const config = this.getConfig();
    const tier = findDifficulty(config, difficulty);
    if (tier === undefined) return { Err: ERR.UNKNOWN_DIFFICULTY };
    const option = tier.durations[durationIndex];
    if (option === undefined) return { Err: ERR.BAD_DURATION_INDEX };

    const owner = caller.toText();
    if (countAtSea(this.ownerShips(owner)) >= config.maxShips) {
      return { Err: ERR.FLEET_FULL };
    }

    const reward = computeReward(tier.stake, option.multiplierBps);
    const pool = this.getPool();
    if (!canReserve(pool, reward)) return { Err: ERR.POOL_INSUFFICIENT };

    // EFFECTS: placeholder ship + reservation, persisted before the await.
    const id = this.counters.get("next_ship_id") ?? 1n;
    this.counters.insert("next_ship_id", id + 1n);
    const now = nowMs();
    const ship: Ship = {
      id,
      owner,
      difficulty,
      durationIndex,
      stake: tier.stake,
      durationMs: option.durationMs,
      multiplierBps: option.multiplierBps,
      failBps: option.failBps,
      reservedReward: reward,
      startedAt: 0n,
      endsAt: 0n,
      status: "launching",
      payout: 0n,
      outcome: null,
      roll: null,
      settledAt: null,
      paidAt: null,
      statusChangedAt: now,
    };
    this.putShip(ship);
    this.shipsByOwner.insert(owner, [
      ...(this.shipsByOwner.get(owner) ?? []),
      id,
    ]);
    this.putPool(applyReserve(pool, reward));

    // INTERACTION: pull the pre-approved stake into this canister.
    try {
      await odinPullToken(
        this.ledger(),
        this.tokenId(),
        caller,
        canisterSelf(),
        tier.stake,
      );
    } catch (error) {
      // Revert: drop the placeholder and give the reservation back. The pool
      // is re-read because other messages ran during the await.
      this.ships.remove(id);
      this.shipsByOwner.insert(
        owner,
        (this.shipsByOwner.get(owner) ?? []).filter((x) => x !== id),
      );
      this.putPool(applyReserveRelease(this.getPool(), reward));
      return { Err: `${ERR.PULL_FAILED}:${errorText(error)}` };
    }

    // EFFECTS after the settled pull. Must not throw.
    try {
      const start = nowMs();
      this.putShip({
        ...(this.ships.get(id) ?? ship),
        status: "sailing",
        startedAt: start,
        endsAt: start + option.durationMs,
        statusChangedAt: start,
      });
      this.putPool(applyLaunchConfirmed(this.getPool(), tier.stake));
      this.bump("launched");
    } catch (error) {
      // The stake is held; the ship record stays 'launching' for the admin
      // to inspect. This branch is unreachable barring a serialisation bug.
      return { Err: `INTERNAL:${errorText(error)}` };
    }
    return { Ok: id };
  }

  /**
   * Roll the outcome of a finished voyage. On a win the payout is attempted
   * immediately (the winner pays the BTC ledger fee — approve 2x
   * `ODIN_BTC_FEE` of BTC first); if that transfer fails the ship stays
   * `payout_pending` and `claim` retries it.
   *
   * ⚠️ AI-GUARD ordering: the ship is locked as `settling` BEFORE the
   * `raw_rand` await, so a second settle call cannot roll twice. Pool
   * bookkeeping for the outcome is finalised BEFORE the payout await.
   */
  @update([IDL.Nat64], ResultIdl(SettleOutcomeIdl))
  async settle(shipId: bigint): Promise<Result<SettleOutcome>> {
    const caller = msgCaller();
    let ship = this.ships.get(shipId);
    if (ship === undefined) return { Err: ERR.SHIP_NOT_FOUND };
    if (ship.owner !== caller.toText()) return { Err: ERR.NOT_OWNER };
    const blocked = canSettle(ship, nowMs(), STUCK_SETTLE_MS);
    if (blocked !== null) return { Err: blocked };

    // EFFECT: lock.
    ship = this.setStatus(ship, "settling");

    // INTERACTION: randomness.
    let roll: number | null = null;
    for (let attempt = 0; attempt < RAND_ATTEMPTS && roll === null; attempt++) {
      let bytes: Uint8Array;
      try {
        const raw = await call<[], Uint8Array | number[]>(
          MANAGEMENT_CANISTER,
          "raw_rand",
          { args: [], paramIdlTypes: [], returnIdlType: IDL.Vec(IDL.Nat8) },
        );
        bytes = Uint8Array.from(raw);
      } catch {
        break;
      }
      try {
        roll = rollBps(bytes);
      } catch {
        break;
      }
    }
    // The lock we took is identified by its `statusChangedAt`. A stale lock
    // (older than STUCK_SETTLE_MS) may have been re-entered by a later settle
    // call while we awaited; if so that call owns the ship now and this one
    // must not touch it.
    const current = this.ships.get(shipId);
    const stillOurs =
      current !== undefined &&
      current.status === "settling" &&
      current.statusChangedAt === ship.statusChangedAt;
    if (roll === null) {
      if (stillOurs) this.setStatus(current, "sailing");
      return { Err: ERR.RAND_UNAVAILABLE };
    }
    if (!stillOurs) {
      return { Err: `${ERR.BAD_STATUS}:${current?.status ?? "missing"}` };
    }

    // EFFECTS: record the outcome. The pool transition is computed first so
    // an accounting error leaves the ship record untouched (still locked for
    // admin_recover_ship) instead of in a terminal status with a stale pool.
    let outcome: SettleOutcome;
    try {
      const decided = decideOutcome(roll, current.failBps);
      const settledAt = nowMs();
      if (decided === "lost") {
        const nextPool = applySettleLost(
          this.getPool(),
          current.stake,
          current.reservedReward,
        );
        this.putShip({
          ...current,
          status: "lost",
          outcome: "lost",
          roll,
          settledAt,
          statusChangedAt: settledAt,
        });
        this.putPool(nextPool);
        this.bump("lost");
        this.trimIndex(current.owner);
        return { Ok: { lost: { stakeLost: current.stake } } };
      }
      const payout = current.stake + current.reservedReward;
      const nextPool = applySettleWon(
        this.getPool(),
        current.stake,
        current.reservedReward,
      );
      this.putShip({
        ...current,
        status: "payout_pending",
        outcome: "won",
        roll,
        payout,
        settledAt,
        statusChangedAt: settledAt,
      });
      this.putPool(nextPool);
      this.bump("won");
      outcome = { won: { payout, paid: false } };
    } catch (error) {
      return { Err: `INTERNAL:${errorText(error)}` };
    }

    // INTERACTION: try to pay now; a failure leaves the ship claimable.
    const paid = await this.tryPayout(shipId);
    return { Ok: { won: { ...outcome.won, paid } } };
  }

  /** Retry the payout of a won ship whose transfer failed. */
  @update([IDL.Nat64], ResultIdl(IDL.Nat))
  async claim(shipId: bigint): Promise<Result<bigint>> {
    const caller = msgCaller();
    const ship = this.ships.get(shipId);
    if (ship === undefined) return { Err: ERR.SHIP_NOT_FOUND };
    if (ship.owner !== caller.toText()) return { Err: ERR.NOT_OWNER };
    const blocked = canClaim(ship);
    if (blocked !== null) return { Err: blocked };
    const paid = await this.tryPayout(shipId);
    if (!paid) {
      const detail = this.meta.get(`payout_error:${shipId}`) ?? "";
      return { Err: `${ERR.PAYOUT_FAILED}:${detail}` };
    }
    return { Ok: ship.payout };
  }

  /**
   * Fee first (pulled from the winner), then the token send. On any failure
   * the status lock is released; the pool is untouched because the payout is
   * still owed. A fee already pulled before a later failure is forfeited, as
   * in the template's withdraw.
   */
  private async tryPayout(shipId: bigint): Promise<boolean> {
    const ship = this.ships.get(shipId);
    if (ship === undefined || ship.status !== "payout_pending") return false;
    // EFFECT: lock.
    this.setStatus(ship, "paying");
    const owner = Principal.fromText(ship.owner);
    try {
      await odinPullToken(
        this.ledger(),
        ODIN_BTC_TOKEN_ID,
        owner,
        canisterSelf(),
        ODIN_BTC_FEE,
      );
      await odinSendToken(this.ledger(), this.tokenId(), owner, ship.payout);
    } catch (error) {
      const current = this.ships.get(shipId);
      if (current !== undefined && current.status === "paying") {
        this.setStatus(current, "payout_pending");
      }
      this.meta.insert(`payout_error:${shipId}`, errorText(error));
      return false;
    }
    try {
      const current = this.ships.get(shipId) ?? ship;
      const paidAt = nowMs();
      const nextPool = applyPaid(this.getPool(), current.payout);
      this.putShip({
        ...current,
        status: "paid",
        paidAt,
        statusChangedAt: paidAt,
      });
      this.putPool(nextPool);
      this.bump("paid");
      this.meta.remove(`payout_error:${shipId}`);
      this.trimIndex(current.owner);
    } catch {
      // Tokens left; the record stays 'paying' for admin_recover_ship.
      return true;
    }
    return true;
  }

  private trimIndex(owner: string): void {
    const ids = this.shipsByOwner.get(owner) ?? [];
    if (ids.length <= OWNER_INDEX_KEEP) return;
    this.shipsByOwner.insert(
      owner,
      trimOwnerIndex(ids, (id) => this.ships.get(id), OWNER_INDEX_KEEP),
    );
  }

  // ── Queries ──────────────────────────────────────────────────────────

  @query([], IDL.Vec(ShipIdl))
  get_my_ships(): CandidShip[] {
    return this.candidShips(msgCaller().toText());
  }

  @query([IDL.Principal], IDL.Vec(ShipIdl))
  get_ships(owner: Principal): CandidShip[] {
    return this.candidShips(owner.toText());
  }

  @query([IDL.Nat64], IDL.Opt(ShipIdl))
  get_ship(shipId: bigint): [] | [CandidShip] {
    const ship = this.ships.get(shipId);
    return ship === undefined
      ? []
      : [toCandidShip(ship, (t) => Principal.fromText(t))];
  }

  @query([], GameConfigIdl)
  get_config(): CandidGameConfig {
    return toCandidConfig(this.getConfig());
  }

  @query([], PoolStatsIdl)
  get_pool_stats(): PoolState & { total: bigint } {
    const pool = this.getPool();
    return { ...pool, total: poolTotal(pool) };
  }

  @query([], IDL.Text)
  get_token_id(): string {
    return this.meta.get("token_id") ?? "";
  }

  @query([], IDL.Opt(IDL.Principal))
  get_owner(): [] | [Principal] {
    const owner = this.meta.get("owner");
    return owner === undefined ? [] : [Principal.fromText(owner)];
  }

  @query([], IDL.Text)
  get_version(): string {
    return VERSION;
  }

  @query([], IDL.Bool)
  is_paused(): boolean {
    return this.isPaused();
  }

  // ── Pool funding ─────────────────────────────────────────────────────

  /**
   * Pull `amount` of the game token from the caller (ICRC-2 pre-approved)
   * into the house pool. Self-verifying, so anyone may donate.
   */
  @update([IDL.Nat], ResultIdl(IDL.Nat))
  async fund_pool(amount: bigint): Promise<Result<bigint>> {
    const caller = msgCaller();
    if (caller.isAnonymous()) return { Err: ERR.ANONYMOUS };
    try {
      validateAmount(amount);
    } catch (error) {
      return { Err: errorText(error) };
    }
    // INTERACTION before EFFECT: credit only what actually settled.
    try {
      await odinPullToken(
        this.ledger(),
        this.tokenId(),
        caller,
        canisterSelf(),
        amount,
      );
    } catch (error) {
      return { Err: `${ERR.PULL_FAILED}:${errorText(error)}` };
    }
    const next = applyFund(this.getPool(), amount);
    this.putPool(next);
    return { Ok: next.available };
  }

  /**
   * Admin: send free pool money back to the admin. Checks-effects-
   * interactions: `available` is debited before the transfer and refunded on
   * failure. The admin pays the BTC fee (approve 2x `ODIN_BTC_FEE`).
   */
  @update([IDL.Nat], ResultIdl(IDL.Nat))
  async withdraw_pool(amount: bigint): Promise<Result<bigint>> {
    const caller = msgCaller();
    if (!this.isAdmin(caller)) return { Err: ERR.NOT_ADMIN };
    try {
      validateAmount(amount);
    } catch (error) {
      return { Err: errorText(error) };
    }
    const pool = this.getPool();
    if (pool.available < amount) return { Err: ERR.POOL_INSUFFICIENT };
    this.putPool(applyWithdraw(pool, amount));
    try {
      await odinPullToken(
        this.ledger(),
        ODIN_BTC_TOKEN_ID,
        caller,
        canisterSelf(),
        ODIN_BTC_FEE,
      );
      await odinSendToken(this.ledger(), this.tokenId(), caller, amount);
    } catch (error) {
      this.putPool(applyFund(this.getPool(), amount));
      return { Err: `${ERR.PAYOUT_FAILED}:${errorText(error)}` };
    }
    return { Ok: this.getPool().available };
  }

  // ── Admin ────────────────────────────────────────────────────────────

  /** Replace the game config. Ships already at sea keep their snapshot. */
  @update([GameConfigIdl], ResultIdl(IDL.Null))
  set_config(config: CandidGameConfig): Result<null> {
    if (!this.isAdmin(msgCaller())) return { Err: ERR.NOT_ADMIN };
    let parsed: GameConfig;
    try {
      parsed = fromCandidConfig(config);
    } catch (error) {
      return { Err: `${ERR.INVALID_CONFIG}:${errorText(error)}` };
    }
    const reason = validateConfig(parsed);
    if (reason !== null) return { Err: `${ERR.INVALID_CONFIG}:${reason}` };
    this.gameConfig.insert("config", parsed);
    return { Ok: null };
  }

  /** Pause blocks `launch` only; settling and claiming always work. */
  @update([IDL.Bool], ResultIdl(IDL.Null))
  set_paused(paused: boolean): Result<null> {
    if (!this.isAdmin(msgCaller())) return { Err: ERR.NOT_ADMIN };
    this.meta.insert("paused", paused ? "1" : "0");
    return { Ok: null };
  }

  @update([IDL.Principal], ResultIdl(IDL.Null))
  set_owner(owner: Principal): Result<null> {
    if (!this.isAdmin(msgCaller())) return { Err: ERR.NOT_ADMIN };
    if (owner.isAnonymous()) return { Err: ERR.ANONYMOUS };
    this.meta.insert("owner", owner.toText());
    return { Ok: null };
  }

  /**
   * Admin: point the canister at another Odin ledger (dev ↔ prod). Only
   * while pristine — no ship ever launched and an empty pool — because all
   * held funds live on the current ledger.
   */
  @update([IDL.Principal], ResultIdl(IDL.Null))
  set_ledger_id(ledger: Principal): Result<null> {
    if (!this.isAdmin(msgCaller())) return { Err: ERR.NOT_ADMIN };
    if (ledger.isAnonymous()) return { Err: ERR.ANONYMOUS };
    if (!isPristine(this.ships.len(), this.getPool())) {
      return { Err: ERR.NOT_PRISTINE };
    }
    this.meta.insert("ledger_id", ledger.toText());
    return { Ok: null };
  }

  /**
   * Admin: change the game token. Same pristine-only rule as
   * `set_ledger_id`: stakes and the pool sit under the current token's
   * subaccount. Note `DEFAULT_CONFIG` stakes assume 10^11 base units.
   */
  @update([IDL.Text], ResultIdl(IDL.Null))
  set_token_id(tokenId: string): Result<null> {
    if (!this.isAdmin(msgCaller())) return { Err: ERR.NOT_ADMIN };
    if (tokenId.trim() === "")
      return { Err: `${ERR.INVALID_CONFIG}:empty token id` };
    if (!isPristine(this.ships.len(), this.getPool())) {
      return { Err: ERR.NOT_PRISTINE };
    }
    this.meta.insert("token_id", tokenId);
    return { Ok: null };
  }

  @query([], IDL.Principal)
  get_ledger_id(): Principal {
    return this.ledger();
  }

  /**
   * Admin: unstick a ship after verifying on the Odin ledger what actually
   * happened. Only `settling → sailing` (no outcome was recorded) and
   * `paying → payout_pending | paid` (transfer did / did not land) are
   * allowed; the latter also fixes the pool's `pendingPayouts`.
   */
  @update([IDL.Nat64, ShipStatusIdl], ResultIdl(IDL.Null))
  admin_recover_ship(
    shipId: bigint,
    toVariant: CandidShipStatus,
  ): Result<null> {
    if (!this.isAdmin(msgCaller())) return { Err: ERR.NOT_ADMIN };
    const ship = this.ships.get(shipId);
    if (ship === undefined) return { Err: ERR.SHIP_NOT_FOUND };
    let to: ShipStatus;
    try {
      to = fromCandidShipStatus(toVariant);
    } catch {
      return { Err: ERR.BAD_TRANSITION };
    }
    if (!isRecoveryTransition(ship.status, to)) {
      return { Err: `${ERR.BAD_TRANSITION}:${ship.status}->${to}` };
    }
    // Pool transitions are computed before the ship record is written so an
    // accounting error leaves the ship untouched.
    try {
      if (to === "paid") {
        const paidAt = nowMs();
        const nextPool = applyPaid(this.getPool(), ship.payout);
        this.putShip({
          ...ship,
          status: "paid",
          paidAt,
          statusChangedAt: paidAt,
        });
        this.putPool(nextPool);
        this.bump("paid");
        this.trimIndex(ship.owner);
      } else if (ship.status === "launching" && to === "sailing") {
        // The stake pull settled but the post-await effect did not run:
        // start the voyage now, as launch would have.
        const start = nowMs();
        const nextPool = applyLaunchConfirmed(this.getPool(), ship.stake);
        this.putShip({
          ...ship,
          status: "sailing",
          startedAt: start,
          endsAt: start + ship.durationMs,
          statusChangedAt: start,
        });
        this.putPool(nextPool);
        this.bump("launched");
      } else {
        this.setStatus(ship, to);
      }
    } catch (error) {
      return { Err: `INTERNAL:${errorText(error)}` };
    }
    return { Ok: null };
  }

  /**
   * ICRC-28: the web origins this canister trusts to request signed calls on
   * a user's behalf. MUST be `@update` (certified), not `@query`.
   */
  @update([], TrustedOriginsIdl)
  icrc28_trusted_origins(): { trusted_origins: string[] } {
    return { trusted_origins: TRUSTED_ORIGINS };
  }
}
