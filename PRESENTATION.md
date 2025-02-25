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
6. Live Demo & Query Examples
7. Extending The Graph: Proposal Metadata Storage
8. Benefits & Results
9. Next Steps

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

---

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
      address: "0x91a8E4a070b4BA4BF2E2a51CB42BDEdf8fFb9B5a"
      abi: GovernorContract
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      entities: [Proposal, Vote]
      eventHandlers:
        - event: ProposalCreated(...)
          handler: handleProposalCreated
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

## Rootstock Collective DAO Project

### Proposals Use case Overview
- Governance tracking for DAO on Rootstock testnet
- Need to efficiently query proposal and voting data
- Real-time updates to frontend governance app

### Requirements
- Track proposals and their lifecycle
- Monitor vote counts and user voting history
- Index governance parameter changes

---

### Technical Challenges
- Aggregating vote counts from individual transactions
- Tracking proposal states through multiple stage changes
- Representing relationships between entities

---

## Our Implementation

### Entity Relationships
```
┌─────────┐       ┌─────────┐
│         │       │         │
│ Proposal│◄──────┤  Vote   │
│         │       │         │
└─────────┘       └─────────┘
```
---

### Key Entities
---

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
  proposal.save()
}

export function handleVoteCast(event: VoteCastEvent): void {
  // Create vote entity
  let voteId = event.params.proposalId.toString() + "-" + event.params.voter.toHexString()
  let vote = new Vote(voteId)
  vote.proposal = event.params.proposalId.toString()
  vote.voter = event.params.voter
  vote.support = event.params.support
  vote.weight = event.params.weight
  vote.reason = event.params.reason
  vote.timestamp = event.block.timestamp
  vote.save()

  // Update proposal vote counts
  let proposal = Proposal.load(event.params.proposalId.toString())
  if (proposal) {
    if (event.params.support == 0) {
      proposal.againstVotes = proposal.againstVotes.plus(event.params.weight)
    } else if (event.params.support == 1) {
      proposal.forVotes = proposal.forVotes.plus(event.params.weight)
    } else if (event.params.support == 2) {
      proposal.abstainVotes = proposal.abstainVotes.plus(event.params.weight)
    }
    proposal.save()
  }
}
```

---

## Live Demo & Query Examples
---

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

### Integration Code Example
```javascript
async function getProposals() {
  const QUERY = `{
    proposals(first: 10, orderBy: createdAt, orderDirection: desc) {
      id
      description
      state
      forVotes
      againstVotes
    }
  }`;

  const data = await request(SUBGRAPH_URL, QUERY);
  return data.proposals;
}
```

---

## Extending The Graph: Proposal Metadata Storage

### The Challenge
- Need to store additional proposal metadata (Discourse forum links)
- Data may expand in the future with more fields
- Need a flexible, scalable solution

---

### Architecture Options

---

#### Option 1: On-chain Event + Graph Indexing
<!-- ![On-chain Event Architecture](https://mermaid.ink/img/pako:eNqVkc1uwjAMx1_FygUJ0ApjF9qtBy6TJk3j0JsXu2mEmsSkCVPVd1-StSvbpEnLIbH_jj9_Oa04oVbcc9Z1rHVoO4M3AjIYpVy6juGN8TdQMjTGa7STw6DlxGGGxp-I2hL9_NXsoPwRWz4ycIPTc8qDK2d2TwGFNkC9PxL09bM4EXdx-OD3LrBLHZLMnRfz5cOj0eP6BQU2QKPtR7ys-cIHDxD_Y0vl6zx1iKaS5bzIXjqQb4S8Jn2ElOpnRuOLn4L14fh72NTZtnhjluVLTcJvyS7tAp1oQ_9gf8iDe9eXKHzCTl1F8LHZJiJn5ow3Tjtr0WXMGf4TLZSydxHDOW0zBl9pW7R8U_NFhU4Pm77fcqUz28D0n7f-qxsLJK7XC7QadR_lUdw?type=png) -->

1. Emit events with metadata references
```solidity
event ProposalMetadataSet(uint256 proposalId, string metadataURI);
```
---

2. Update schema
```graphql
type Proposal @entity {
  id: ID!
  # existing fields
  metadataURI: String
  discourseUrl: String
}
```
---

3. Add handler
```typescript
export function handleProposalMetadataSet(event: ProposalMetadataSetEvent): void {
  let proposal = Proposal.load(event.params.proposalId.toString());
  if (proposal) {
    proposal.metadataURI = event.params.metadataURI;
    proposal.save();
  }
}
```
---

#### Option 2: IPFS + Graph Reference
<!-- ![IPFS Architecture](https://mermaid.ink/img/pako:eNqVksFuwjAMhl_FygUJ0AK7ML0depi0SRuH3rzYTSPUJCYNQ1XfvaTdGBtIEx-S-Pf3_3bqiHuUgnvKXMuaFk1r8EzQHUaphLaluFb-CgoGjXmN9mZptJxxmKH2J6KXRH_9ejZQ_YgtHxkYw-kp5cGZM7svgULjoR_PhDZ8LF_CFGEuN3w7cCYXNzV5K7p-CHrlbZNyiDQdYk73vwV3ZNBKT9QPbyEzWDwt5nP4-MQoLtJHEFhDM-yGdF3xnQ_uYf6HL5Wvy5TnOWOW7tH4crvT4qFT0ib3sCR9hpTqlRm6F-h38HE-pzflOyqfV2fpbG1D_1B_CUKcuw-jKqAT7hA-NedE5KwZadppa1vQGXWG_0RjpayrCGdpkVH4Slui5Vedr4T2I_TjEChnimFmcf2fDVLJtUy71aFV_LxxqA7qDyNsxsY?type=png) -->
---

```typescript
// In the dApp
async function getProposalWithMetadata(proposalId) {
  // Query subgraph for the basic proposal
  const { proposal } = await request(SUBGRAPH_URL, `{
    proposal(id: "${proposalId}") {
      id
      description
      metadataURI
    }
  }`);
  
  // If there's a metadataURI, fetch the additional data
  if (proposal.metadataURI) {
    const metadata = await fetch(proposal.metadataURI).then(r => r.json());
    return {
      ...proposal,
      discourseUrl: metadata.discourseUrl,
      // other metadata fields...
    };
  }
  
  return proposal;
}
```
---

#### Possible Implementation Extension: Flexible Schema Approach
```graphql
type Proposal @entity {
  id: ID!
  # existing fields...
  metadata: [MetadataField!] @derivedFrom(field: "proposal")
}

type MetadataField @entity {
  id: ID!
  proposal: Proposal!
  key: String!
  value: String!
}
```
---

```typescript
export function handleProposalMetadataSet(event: ProposalMetadataSetEvent): void {
  // Create metadata field
  let fieldId = event.params.proposalId.toString() + "-discourse";
  let field = new MetadataField(fieldId);
  field.proposal = event.params.proposalId.toString();
  field.key = "discourseUrl";
  field.value = event.params.url;
  field.save();
}
```

---

## Benefits & Results

### Development Speed
- No need for custom indexing infrastructure
- Simple GraphQL queries vs complex RPC calls
- Automatic updates when new events occur
---

### User Experience
- ~10x faster data loading
- Complex filters and sorting
- Simplified frontend code
---

### Maintenance
- Subgraph updates independent of frontend
- Scalable with growing usage
- No database management

---

## Next Steps

### Potential Extensions
- Cross-chain governance monitoring
- Historical voting power snapshots*
- Dynamic metadata resolution
- Add delegation tracking for voting power
- Create analytics entities for governance metrics

---

### Integration with Other Systems
- Notification systems**
- Governance analytics

---

## Thank You!

**Questions?**
