---
marp: true
---

# The Graph Protocol & Rootstock Collective DAO
## Decentralized Indexing for Blockchain Data

---

## Agenda

1. Introduction to The Graph Protocol
2. How The Graph Works
3. Anatomy of a Subgraph
4. Rootstock Collective DAO Project
5. Our Implementation
6. Advanced Features & Optimizations
7. Extending The Graph: Proposal Metadata Storage
8. Live Demo & Query Examples
9. Benefits & Results
10. Next Steps

---

## Introduction to The Graph

### What is The Graph?
- Decentralized protocol for indexing and querying blockchain data
- Often described as the "Google of blockchains"
- Makes blockchain data easily accessible through GraphQL APIs

### The Problem It Solves
- Direct blockchain queries are:
  - Inefficient (multiple RPC calls)
  - Limited (only basic lookups)
  - Resource-intensive
  - Slow for complex operations

### Core Value Proposition
- Fast, reliable access to blockchain data
- Complex queries with relationships
- Real-time indexing
- Developer-friendly GraphQL API

---

## How The Graph Works

### Architecture Overview
<!-- ![Graph Architecture](https://thegraph.com/assets/img/architecture-graphic.png) -->

1. **Indexers**: Node operators who maintain subgraphs
2. **Curators**: Signal which subgraphs are valuable
3. **Delegators**: Stake GRT tokens to indexers
4. **Consumers**: Pay for queries using GRT tokens

### Data Flow
1. Smart contracts emit events on blockchain
2. Subgraphs detect and process these events
3. Data is stored in an indexed database
4. Applications query data through GraphQL endpoints

---

## Anatomy of a Subgraph

### Key Components

```
my-subgraph/
├── subgraph.yaml     # Manifest configuration
├── schema.graphql    # Data entities definition
└── src/
    └── mapping.ts    # Event handlers (AssemblyScript)
```
---

### YAML Configuration
```yaml
dataSources:
  - kind: ethereum
    name: GovernorContract
    network: rootstock-testnet
    source:
      address: "0xB1A39B8f57A55d1429324EEb1564122806eb297F"
      abi: GovernorContract
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      entities: [Proposal, Vote]
      eventHandlers:
        - event: ProposalCreated(...)
          handler: handleProposalCreated
      blockHandlers:
        - handler: handleBlock
```
---

### GraphQL Schema
```graphql
type Proposal @entity {
  id: ID!
  description: String!
  votes: [Vote!]! @derivedFrom(field: "proposal")
}

type Vote @entity {
  id: ID!
  proposal: Proposal!
  voter: Bytes!
}
```

---

## Rootstock Collective DAO Governor(Proposals Use Case)

### Project Overview
- Governance tracking for DAO on Rootstock testnet
- Need to efficiently query proposal and voting data
- Real-time updates to frontend governance app

### Requirements
- Track proposals and their lifecycle states
- Monitor vote counts and user voting history
- Index governance parameter changes
- Real-time state monitoring
---

### Technical Challenges
- Aggregating vote counts from individual transactions
- Tracking proposal states through multiple stage changes
- Representing relationships between entities
- Keeping states synchronized with blockchain

---

## Our Implementation

### Entity Relationships
```
┌─────────┐       ┌─────────┐
│         │       │         │
│ Proposal│◄──────┤  Vote   │
│         │       │         │
└─────────┘       └─────────┘
     ▲
     │
     │
┌────┴────┐
│         │
│ Counter │
│         │
└─────────┘
```
---
### Key Entities

#### Proposal
```graphql
type Proposal @entity {
  id: ID!
  proposalId: BigInt!
  proposer: Bytes!
  description: String!
  state: ProposalState!
  createdAt: BigInt!
  votes: [Vote!]! @derivedFrom(field: "proposal")
  forVotes: BigInt!
  againstVotes: BigInt!
  abstainVotes: BigInt!
  quorumVotes: BigInt!
}

enum ProposalState {
  Pending
  Active
  Canceled
  Defeated
  Succeeded
  Queued
  Expired
  Executed
}
```
---
#### Vote
```graphql
type Vote @entity {
  id: ID!
  proposal: Proposal!
  voter: Bytes!
  support: Int!
  weight: BigInt!
  reason: String
  timestamp: BigInt!
}
```
---

#### Counter
```graphql
type Counter @entity {
  id: ID!
  count: Int!
}
```
---

### Event Handlers

```typescript
export function handleProposalCreated(event: ProposalCreatedEvent): void {
  let proposal = new Proposal(event.params.proposalId.toString())
  proposal.proposalId = event.params.proposalId
  proposal.proposer = event.params.proposer
  proposal.description = event.params.description
  proposal.state = "Pending"
  proposal.createdAt = event.block.timestamp
  proposal.forVotes = BigInt.fromI32(0)
  proposal.againstVotes = BigInt.fromI32(0)
  proposal.abstainVotes = BigInt.fromI32(0)
  
  // Get quorum
  let contract = GovernorContract.bind(event.address)
  let quorumCall = contract.try_quorum(event.block.number)
  if (!quorumCall.reverted) {
    proposal.quorumVotes = quorumCall.value
  } else {
    proposal.quorumVotes = BigInt.fromI32(0)
  }
  
  proposal.save()
  
  // Track for state updates
  addActiveProposal(proposal.id)
  
  // Update counter
  incrementCounter("proposals")
}
```

---

## Advanced Features & Optimizations

### Real-time State Tracking with Block Handlers

```typescript
export function handleBlock(block: ethereum.Block): void {
  let tracker = ActiveProposalTracker.load("1")
  if (!tracker) return
  
  let proposalIds = tracker.activeProposals
  let governorContract = GovernorContract.bind(Address.fromString(
    "0xB1A39B8f57A55d1429324EEb1564122806eb297F"
  ))
  
  for (let i = 0; i < proposalIds.length; i++) {
    let proposalId = proposalIds[i]
    let proposal = Proposal.load(proposalId)
    
    if (proposal) {
      // Check current state from contract
      let stateCall = governorContract.try_state(
        BigInt.fromString(proposalId)
      )
      
      if (!stateCall.reverted) {
        // Update proposal state when it changes
        let newState = mapStateToString(stateCall.value)
        if (proposal.state != newState) {
          proposal.state = newState
          proposal.save()
        }
      }
    }
  }
}
```
---
### Active Proposal Tracking

```typescript
// Tracking active proposals
type ActiveProposalTracker @entity {
  id: ID!
  activeProposals: [String!]!
}

function addActiveProposal(proposalId: string): void {
  let tracker = getOrCreateTracker()
  let proposals = tracker.activeProposals
  proposals.push(proposalId)
  tracker.activeProposals = proposals
  tracker.save()
}

function removeActiveProposal(proposalId: string): void {
  // Remove from active tracking when in terminal state
}
```
---
### Efficient Counter Implementation

```typescript
// Helper to increment a counter
function incrementCounter(counterId: string): void {
  let counter = Counter.load(counterId)
  if (!counter) {
    counter = new Counter(counterId)
    counter.count = 0
  }
  counter.count += 1
  counter.save()
}
```

---

## Extending The Graph: Proposal Metadata Storage

### The Challenge
- Need to store additional proposal metadata (Discourse forum links)
- Data may expand in the future with more fields
- Must be flexible and scalable

### Architecture Options

#### Option 1: On-chain Event + Graph Indexing
<!-- ![On-chain Event Architecture](https://mermaid.ink/img/pako:eNqVkc1uwjAMx1_FygUJ0ApjF9qtBy6TJk3j0JsXu2mEmsSkCVPVd1-StSvbpEnLIbH_jj9_Oa44oVbcc9Z1rHVoO4M3AjIYpVy6juGN8TdQMjTGa7STw6DlxGGGxp-I2hL9_NXsoPwRWz4ycIPTc8qDK2d2TwGFNkC9PxL09bM4EXdx-OD3LrBLHZLMnRfz5cOj0eP6BQU2QKPtR7ys-cIHDxD_Y0vl6zx1iKaS5bzIXjqQb4S8Jn2ElOpnRuOLn4L14fh72NTZtnhjluVLTcJvyS7tAp1oQ_9gf8iDe9eXKHzCTl1F8LHZJiJn5ow3Tjtr0WXMGf4TLZSydxHDOW0zBl9pW7R8U_NFhU4Pm77fcqUz28D0n7f-qxsLJK7XC7QadR_lUdw?type=png) -->

```solidity
// In your Governor contract extension
event ProposalMetadataSet(uint256 proposalId, string metadataURI);

function setProposalMetadata(uint256 proposalId, string calldata metadataURI) external {
    require(msg.sender == proposals[proposalId].proposer, "Not proposer");
    emit ProposalMetadataSet(proposalId, metadataURI);
}
```

```graphql
type Proposal @entity {
  id: ID!
  # existing fields...
  metadataURI: String
  discourseUrl: String
}
```

#### Option 2: IPFS + Graph Reference
<!-- ![IPFS Architecture](https://mermaid.ink/img/pako:eNqVksFuwjAMhl_FygUJ0AK7ML0depi0SRuH3rzYTSPUJCYNQ1XfvaTdGBtIEx-S-Pf3_3bqiHuUgnvKXMuaFk1r8EzQHUaphLaluFb-CgoGjXmN9mZptJxxmKH2J6KXRH_9ejZQ_YgtHxkYw-kp5cGZM7svgULjoR_PhDZ8LF_CFGEuN3w7cCYXNzV5K7p-CHrlbZNyiDQdYk73vwV3ZNBKT9QPbyEzWDwt5nP4-MQoLtJHEFhDM+yGdF3xnQ_uYf6HL5Wvy5TnOWOW7tH4crvT4qFT0ib3sCR9hpTqlRm6F-h38HE-pzflOyqfV2fpbG1D_1B_CUKcuw-jKqAT7hA-NedE5KwZadppa1vQGXWG_0RjpayrCGdpkVH4Slui5Vedr4T2I_TjEChnimFmcf2fDVLJtUy71aFV_LxxqA7qDyNsxsY?type=png) -->

```typescript
// In your frontend
async function getProposalWithMetadata(proposalId) {
  // Query your subgraph
  const { proposal } = await request(SUBGRAPH_URL, `{
    proposal(id: "${proposalId}") {
      id
      description
      metadataURI
    }
  }`);
  
  // If there's a metadataURI, fetch the data
  if (proposal.metadataURI) {
    const metadata = await fetch(proposal.metadataURI).then(r => r.json());
    return {
      ...proposal,
      discourseUrl: metadata.discourseUrl
    };
  }
  
  return proposal;
}
```

---

## Live Demo & Query Examples

### Getting Recent Proposals
```graphql
{
  proposals(first: 5, orderBy: createdAt, orderDirection: desc) {
    id
    description
    state
    forVotes
    againstVotes
    abstainVotes
  }
}
```
---
### Total Count of Proposals
```graphql
{
  counter(id: "proposals") {
    count
  }
}
```
---
### Active Proposals
```graphql
{
  proposals(where: { state: Active }) {
    id
    description
    voteEnd
    forVotes
    againstVotes
  }
}
```
---
### Checking User Voting History
```graphql
{
  votes(where: { voter: "0x123...abc" }) {
    proposal {
      id
      description
    }
    support
    weight
    timestamp
  }
}
```
---
### Integration Code Example
```javascript
import { request, gql } from 'graphql-request';

async function fetchProposals() {
  const QUERY = gql`
    {
      proposals(first: 10, orderBy: createdAt, orderDirection: desc) {
        id
        description
        state
        forVotes
        againstVotes
      }
    }
  `;

  const data = await request(SUBGRAPH_URL, QUERY);
  return data.proposals;
}
```

---

## Benefits & Results

### Development Speed
- No need for custom indexing infrastructure
- Simple GraphQL queries vs complex RPC calls
- Automatic updates when new events occur

### User Experience
- ~10x faster data loading than direct RPC calls
- Complex filters and sorting
- Real-time state updates
---
### Maintenance
- Subgraph updates independent of frontend
- Scalable with growing usage
- No database management
- Automatic state synchronization
---
### Comparison to Traditional Alternatives
| Feature | The Graph | Custom DB | Direct RPC |
|---------|-----------|-----------|------------|
| Setup Complexity | Medium | High | Low |
| Query Speed | Fast | Fast | Slow |
| Decentralization | High | None | Medium |
| Maintenance | Low | High | Low |
| Complex Queries | Yes | Yes | Limited |
| State Consistency | Automatic | Manual | Manual |

---

## Next Steps

### Planned Improvements
- Add delegation tracking for voting power
- Implement proposal execution monitoring
- Create analytics entities for governance metrics
---
### Potential Extensions
- Cross-chain governance monitoring
- Historical voting power snapshots
- Dynamic metadata resolution

### Integration with Other Systems
- Frontend voting dashboard
- Notification systems
- Governance analytics

---

## Thank You!
