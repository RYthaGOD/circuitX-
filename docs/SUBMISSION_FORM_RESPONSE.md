# CircuitX - Track Fit Explanation

## How CircuitX Fits Into the Track

### Creative Privacy Applications ($26,000)

CircuitX delivers **true privacy in perpetual futures trading** through Zero-Knowledge proofs. Unlike traditional privacy solutions that hide transaction amounts, CircuitX protects **trading strategy privacy**—position size, entry price, margin, and direction are cryptographically hidden while maintaining full on-chain verification.

**Privacy Innovation:**
- Only commitment hashes stored on-chain (impossible to reverse-engineer position details)
- ZK proofs verify position validity without revealing identity or strategy
- MEV-resistant: private positions cannot be front-run
- Complete confidentiality: even the protocol cannot see position details

**Technical Implementation:**
- Noir ZK circuits generate Pedersen commitment hashes from private inputs
- UltraHonk proofs via Garaga verifier for on-chain validation
- Privacy-first architecture: DataStore stores only commitment hashes
- Automatic PnL settlement with privacy preservation

**Creative Application:**
This is a novel application of ZK technology to **trading strategy privacy**—protecting what traders are doing, not just who they are. Enables institutional trading, MEV protection, and strategy protection in a way that hasn't been achieved in perpetual futures DEXs.

---

### Project-Specific Bounty: "Surprise us" ($20,000)

CircuitX is **exactly** the "Private perps" example mentioned in the wildcard bounty—a fully functional, privacy-native perpetual futures DEX on Ztarknet using Noir contracts and Garaga.

**Direct Alignment:**
- ✅ Private Perpetuals: Complete privacy for perpetual futures positions
- ✅ Built on Ztarknet: Fully deployed and functional
- ✅ Noir Contracts: Custom circuits for ZK proof generation
- ✅ Garaga Integration: UltraHonk proofs verified on-chain

**Unique Innovation Beyond Example:**
- End-to-end privacy: private opening, closing, and PnL settlement
- Automatic profit/loss calculation via ZK proofs without revealing details
- Full leverage trading (20x) with complete privacy
- Multiple order types (Market, Limit, TWAP) all privacy-preserving

**High-Impact:**
- Enables large traders to execute strategies without revealing positions
- Eliminates front-running risks inherent in public order books
- Protects trading strategies from competitors
- Production-ready implementation demonstrating feasibility

**Why It's a Surprise:**
While "private perps" was mentioned as an example, CircuitX delivers a **complete, working implementation** that proves private perpetual trading is not just possible—it's functional, usable, and scalable. Our modular architecture, intuitive UI, and comprehensive documentation show this is production-ready technology, not just a proof-of-concept.

---

## Summary

CircuitX fits both tracks by delivering **true privacy in perpetual futures trading**—a creative ZK application that directly addresses the "Private perps" wildcard example. We've built the first fully private perpetual DEX with complete end-to-end privacy, MEV resistance, and a production-ready implementation on Ztarknet. This demonstrates that private perpetual trading is not just a concept but a working reality.





