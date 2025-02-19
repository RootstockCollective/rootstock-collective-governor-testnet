# Rootstock Collective DAO Subgraph

This subgraph indexes and tracks governance events for the Rootstock Collective DAO Governor contract on Rootstock testnet.

## Overview

The subgraph tracks key governance activities including:
- Proposal creation and lifecycle
- Voting activities
- Governance parameter changes
- Contract upgrades and administrative actions

## Schema Design

### Core Entities

#### Proposal
```graphql
type Proposal @entity {
  id: ID!
  proposalId: BigInt!
  proposer: Bytes!
  targets: [Bytes!]!
  values: [BigInt!]!
  signatures: [String!]!
  calldatas: [Bytes!]!
  voteStart: BigInt!
  voteEnd: BigInt!
  description: String!
  state: ProposalState!
  createdAt: BigInt!
  votes: [Vote!]! @derivedFrom(field: "proposal")
  forVotes: BigInt!
  againstVotes: BigInt!
  abstainVotes: BigInt!
}
```

The Proposal entity aggregates all proposal-related data and maintains the current state. Key features:
- Tracks full proposal details including execution data
- Maintains vote tallies
- Links to all votes cast
- Tracks proposal lifecycle states

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

The Vote entity tracks individual votes cast, enabling:
- Per-address voting history
- Vote weight tracking
- Vote reasoning/rationale storage
- Temporal analysis of voting patterns

### Scalability Considerations

The schema is designed for scalability:
1. Efficient querying through strategic ID formatting
2. Bidirectional relationships between proposals and votes
3. Aggregated vote counts at proposal level
4. State tracking for proposal lifecycle

## Example Queries

### Get Recent Proposals
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

### Get User Voting History
```graphql
{
  votes(where: { voter: "0x..." }) {
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

### Get Active Proposals
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

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Generate types:
```bash
graph codegen
```

3. Build subgraph:
```bash
graph build
```

4. Deploy:
```bash
graph deploy your-github-username/rootstock-collective-dao --product hosted-service
```

## Event Handling

The subgraph handles multiple governance events:
- `ProposalCreated`: Creates new proposal entities
- `VoteCast`: Records votes and updates proposal vote counts
- `ProposalExecuted`, `ProposalCanceled`, `ProposalQueued`: Updates proposal states

### Complete Implementation Details

#### Schema Definition (schema.graphql)
```graphql
type Proposal @entity {
  id: ID!
  proposalId: BigInt!
  proposer: Bytes!
  targets: [Bytes!]!
  values: [BigInt!]!
  signatures: [String!]!
  calldatas: [Bytes!]!
  voteStart: BigInt!
  voteEnd: BigInt!
  description: String!
  state: ProposalState!
  createdAt: BigInt!
  votes: [Vote!]! @derivedFrom(field: "proposal")
  forVotes: BigInt!
  againstVotes: BigInt!
  abstainVotes: BigInt!
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

#### Mapping Functions (governor-rootstock-collective.ts)
```typescript
export function handleProposalCreated(event: ProposalCreatedEvent): void {
  let proposal = new Proposal(event.params.proposalId.toString())
  proposal.proposalId = event.params.proposalId
  proposal.proposer = event.params.proposer
  proposal.targets = changetype<Bytes[]>(event.params.targets)
  proposal.values = event.params.values
  proposal.signatures = event.params.signatures
  proposal.calldatas = event.params.calldatas
  proposal.voteStart = event.params.voteStart
  proposal.voteEnd = event.params.voteEnd
  proposal.description = event.params.description
  proposal.state = "Pending"
  proposal.createdAt = event.block.timestamp
  proposal.forVotes = BigInt.fromI32(0)
  proposal.againstVotes = BigInt.fromI32(0)
  proposal.abstainVotes = BigInt.fromI32(0)
  proposal.save()
}

export function handleVoteCast(event: VoteCastEvent): void {
  let voteId = event.params.proposalId.toString()
    .concat("-")
    .concat(event.params.voter.toHexString())
  
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

export function handleProposalExecuted(event: ProposalExecutedEvent): void {
  let proposal = Proposal.load(event.params.proposalId.toString())
  if (proposal) {
    proposal.state = "Executed"
    proposal.save()
  }
}

export function handleProposalCanceled(event: ProposalCanceledEvent): void {
  let proposal = Proposal.load(event.params.proposalId.toString())
  if (proposal) {
    proposal.state = "Canceled"
    proposal.save()
  }
}

export function handleProposalQueued(event: ProposalQueuedEvent): void {
  let proposal = Proposal.load(event.params.proposalId.toString())
  if (proposal) {
    proposal.state = "Queued"
    proposal.save()
  }
}
```

## Future Enhancements

Potential improvements:
1. Add delegation tracking
2. Implement vote power snapshots
3. Add proposal execution tracking
4. Add analytics entities for governance metrics

## Resources

- [The Graph Documentation](https://thegraph.com/docs/en/)
- [Governor Contract Reference](https://docs.openzeppelin.com/contracts/4.x/api/governance)

## Testing

Before deployment, test your subgraph's indexing status:

```graphql
{
  _meta {
    block {
      number
      hash
    }
    deployment
    hasIndexingErrors
  }
}
```

Check for indexed proposals:
```graphql
{
  proposalCreateds(first: 5) {
    id
    proposalId
    proposer
    blockNumber
  }
}
```

Monitor votes:
```graphql
{
  voteCasts(first: 5) {
    id
    voter
    proposalId
    support
    weight
  }
}
```

## Note on Integration

This subgraph is designed to work seamlessly with frontend applications. The entity structure allows for efficient querying of proposal states and vote tracking, making it ideal for governance dashboards and voting interfaces.

For example, the voting modal we implemented can directly query the subgraph to display:
- Current proposal status
- Vote counts
- User's voting history
- Proposal details

The schema is also extensible, allowing for future additions to track more governance metrics as the DAO evolves.
