// SPDX-License-Identifier: MIT
// =====================================================================================================
//  ILLUSTRATIVE SPECIFICATION ONLY. NOT COMPILED, NOT DEPLOYED, NOT AUDITED. DO NOT SEND FUNDS.
//  Interface for the real-RF Last Heist stake escrow described in docs/STAKES.md, section 2.
//  Rare Heist today runs stake rounds in DEMO RF (play money) on its server; no contract of ours exists.
// =====================================================================================================
pragma solidity ^0.8.24;

/// @notice Escrow for Last Heist stake rounds on Robinhood Chain (chain id 4663).
/// Stake token: RF, 0x0779369854d3EcdEA927206718FFD7730C67B71f. Entries: Generations Friends,
/// 0x14C49e6118F46525dE9ab41a51cBAA3c6EBF181D. Burn address: 0x000000000000000000000000000000000000dEaD.
/// Funds can only go to (a) a winning Friend's token-bound account, (b) 0x…dEaD, or (c) back to the payer.
interface IRareHeistStakes {
    enum Status { None, Open, ResultPosted, Settled, Refunding }
    enum Outcome { None, Winner, Uncontested, NoClear }

    struct Round {
        uint128 stake;          // fixed RF stake per entry (18 decimals)
        uint64 closesAt;        // no stakes at or after this time
        uint64 resultBy;        // no result by then => refunds open (liveness)
        uint64 challengeEndsAt; // set by postResult
        uint32 entrants;
        uint256 pot;            // RF actually received
        bytes32 rulesHash;      // engine + rules + opening level the round is played under
        bytes32 proofHash;      // keccak256 of the published proof bundle
        uint256 winnerFriendId;
        Status status;
        Outcome outcome;
    }

    event RoundCreated(bytes32 indexed roundId, uint128 stake, uint64 closesAt, uint64 resultBy, bytes32 rulesHash);
    event Staked(bytes32 indexed roundId, uint256 indexed friendId, address indexed payer, uint256 amount);
    event ResultPosted(bytes32 indexed roundId, Outcome outcome, uint256 winnerFriendId, bytes32 proofHash, string proofURI, uint64 challengeEndsAt);
    event Vetoed(bytes32 indexed roundId, address guardian);
    event Settled(bytes32 indexed roundId, Outcome outcome, uint256 winnerFriendId, uint256 payout, uint256 burned);
    event Claimed(bytes32 indexed roundId, uint256 indexed friendId, address tokenBoundAccount, uint256 amount);
    event Refunded(bytes32 indexed roundId, uint256 indexed friendId, address payer, uint256 amount);

    /// Operator. Parameters are fixed for the life of the round.
    function createRound(bytes32 roundId, uint128 stake, uint64 closesAt, uint64 resultBy, bytes32 rulesHash) external;

    /// Player, after RF.approve(this, stake). msg.sender must own `friendId` or be its token-bound account;
    /// the Friend must be hardwired; one entry per Friend per round. Credits the balance delta actually received.
    function stake(bytes32 roundId, uint256 friendId) external;

    /// Result poster only; once per round. `Winner` requires two distinct clearing Friends (checked off-chain by
    /// anyone replaying the bundle at `proofURI`). Opens the challenge window.
    function postResult(bytes32 roundId, Outcome outcome, uint256 winnerFriendId, bytes32 proofHash, string calldata proofURI) external;

    /// Guardian only, inside the challenge window. The round becomes refundable.
    function veto(bytes32 roundId) external;

    /// Anyone, after the challenge window. Winner: burn = pot - floor(pot * 7000 / 10000) is transferred to
    /// 0x…dEaD in this transaction and the rest becomes claimable. Otherwise every stake becomes refundable.
    function settle(bytes32 roundId) external;

    /// Only the winning Friend's token-bound account (read from Generations at call time). Pull payment.
    function claim(bytes32 roundId) external;

    /// Anyone, for any entry, when the round is Refunding or has missed its liveness deadline.
    /// Pays the address that made the stake.
    function refund(bytes32 roundId, uint256 friendId) external;

    /// Guardian. Stops createRound, stake and postResult. Never stops claim or refund.
    function pause() external;
    function unpause() external;

    function rounds(bytes32 roundId) external view returns (Round memory);
    function entered(bytes32 roundId, uint256 friendId) external view returns (bool);
    function claimable(bytes32 roundId) external view returns (uint256 amount, uint256 friendId);

    /// Constants: WINNER_BPS = 7000, BURN = 0x000000000000000000000000000000000000dEaD, no upgrade path,
    /// no admin withdrawal. Key rotation and per-round caps go through a 48-hour timelock.
    function WINNER_BPS() external pure returns (uint16);
}
