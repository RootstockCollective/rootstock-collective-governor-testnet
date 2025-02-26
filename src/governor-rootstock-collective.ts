import {
  EIP712DomainChanged as EIP712DomainChangedEvent,
  Initialized as InitializedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  ProposalCanceled as ProposalCanceledEvent,
  ProposalCreated as ProposalCreatedEvent,
  ProposalExecuted as ProposalExecutedEvent,
  ProposalQueued as ProposalQueuedEvent,
  ProposalThresholdSet as ProposalThresholdSetEvent,
  QuorumNumeratorUpdated as QuorumNumeratorUpdatedEvent,
  TimelockChange as TimelockChangeEvent,
  Upgraded as UpgradedEvent,
  VoteCast as VoteCastEvent,
  VoteCastWithParams as VoteCastWithParamsEvent,
  VotingDelaySet as VotingDelaySetEvent,
  VotingPeriodSet as VotingPeriodSetEvent,
  GovernorRootstockCollective as GovernorContract
} from "../generated/GovernorRootstockCollective/GovernorRootstockCollective"
import {
  EIP712DomainChanged,
  Initialized,
  OwnershipTransferred,
  ProposalCanceled,
  ProposalCreated,
  ProposalExecuted,
  ProposalQueued,
  ProposalThresholdSet,
  QuorumNumeratorUpdated,
  TimelockChange,
  Upgraded,
  VoteCast,
  VoteCastWithParams,
  VotingDelaySet,
  VotingPeriodSet,
  Proposal,
  Vote,
  ActiveProposalTracker,
  Counter
} from "../generated/schema"
import { BigInt, Address, ethereum, Bytes, store } from "@graphprotocol/graph-ts"

export function handleEIP712DomainChanged(
  event: EIP712DomainChangedEvent
): void {
  let entity = new EIP712DomainChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleInitialized(event: InitializedEvent): void {
  let entity = new Initialized(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.version = event.params.version

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}


export function handleProposalThresholdSet(
  event: ProposalThresholdSetEvent
): void {
  let entity = new ProposalThresholdSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.oldProposalThreshold = event.params.oldProposalThreshold
  entity.newProposalThreshold = event.params.newProposalThreshold

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleQuorumNumeratorUpdated(
  event: QuorumNumeratorUpdatedEvent
): void {
  let entity = new QuorumNumeratorUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.oldQuorumNumerator = event.params.oldQuorumNumerator
  entity.newQuorumNumerator = event.params.newQuorumNumerator

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleTimelockChange(event: TimelockChangeEvent): void {
  let entity = new TimelockChange(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.oldTimelock = event.params.oldTimelock
  entity.newTimelock = event.params.newTimelock

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleUpgraded(event: UpgradedEvent): void {
  let entity = new Upgraded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.implementation = event.params.implementation

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleVotingDelaySet(event: VotingDelaySetEvent): void {
  let entity = new VotingDelaySet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.oldVotingDelay = event.params.oldVotingDelay
  entity.newVotingDelay = event.params.newVotingDelay

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleVotingPeriodSet(event: VotingPeriodSetEvent): void {
  let entity = new VotingPeriodSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.oldVotingPeriod = event.params.oldVotingPeriod
  entity.newVotingPeriod = event.params.newVotingPeriod

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

// Helper to increment a counter
function incrementCounter(counterId: string): void {
  let counter = Counter.load(counterId);
  if (!counter) {
    counter = new Counter(counterId);
    counter.count = 0;
  }
  counter.count += 1;
  counter.save();
}

// Helper to ensure tracker exists and return it
function getOrCreateTracker(): ActiveProposalTracker {
  let tracker = ActiveProposalTracker.load("1");
  if (!tracker) {
    tracker = new ActiveProposalTracker("1");
    tracker.activeProposals = [];
    tracker.save();
  }
  return tracker;
}

// Helper to add a proposal to active tracking
function addActiveProposal(proposalId: string): void {
  let tracker = getOrCreateTracker();
  let proposals = tracker.activeProposals;
  proposals.push(proposalId);
  tracker.activeProposals = proposals;
  tracker.save();
}

// Helper to remove a proposal from active tracking
function removeActiveProposal(proposalId: string): void {
  let tracker = getOrCreateTracker();
  let proposals = tracker.activeProposals;
  let index = proposals.indexOf(proposalId);

  if (index > -1) {
    proposals.splice(index, 1);
    tracker.activeProposals = proposals;
    tracker.save();
  }
}

export function handleProposalCreated(event: ProposalCreatedEvent): void {
  // Create the proposal entity
  let proposalId = event.params.proposalId.toString();
  let proposal = new Proposal(proposalId);

  proposal.proposalId = event.params.proposalId;
  proposal.proposer = event.params.proposer;
  proposal.targets = changetype<Bytes[]>(event.params.targets);
  proposal.values = event.params.values;
  proposal.signatures = event.params.signatures;
  proposal.calldatas = event.params.calldatas;
  proposal.voteStart = event.params.voteStart;
  proposal.voteEnd = event.params.voteEnd;
  proposal.description = event.params.description;
  proposal.state = "Pending";
  proposal.createdAt = event.block.timestamp;
  proposal.forVotes = BigInt.fromI32(0);
  proposal.againstVotes = BigInt.fromI32(0);
  proposal.abstainVotes = BigInt.fromI32(0);

  // Get quorum at creation time - this would ideally be a contract call
  let contract = GovernorContract.bind(event.address);
  let quorumAtCreation = contract.try_quorum(event.block.number);

  if (!quorumAtCreation.reverted) {
    proposal.quorumVotes = quorumAtCreation.value;
  } else {
    proposal.quorumVotes = BigInt.fromI32(0);
  }

  proposal.save();

  // Add to active proposals tracker
  addActiveProposal(proposalId);

  // Increment proposals counter
  incrementCounter("proposals");
}

export function handleProposalCanceled(event: ProposalCanceledEvent): void {
  let proposalId = event.params.proposalId.toString();
  let proposal = Proposal.load(proposalId);

  if (proposal) {
    proposal.state = "Canceled";
    proposal.save();

    // Remove from active tracking
    removeActiveProposal(proposalId);
  }
}

export function handleProposalExecuted(event: ProposalExecutedEvent): void {
  let proposalId = event.params.proposalId.toString();
  let proposal = Proposal.load(proposalId);

  if (proposal) {
    proposal.state = "Executed";
    proposal.save();

    // Remove from active tracking
    removeActiveProposal(proposalId);
  }
}

export function handleProposalQueued(event: ProposalQueuedEvent): void {
  let proposalId = event.params.proposalId.toString();
  let proposal = Proposal.load(proposalId);

  if (proposal) {
    proposal.state = "Queued";
    proposal.save();
  }
}

export function handleVoteCast(event: VoteCastEvent): void {
  // Create vote entity
  let voteId = event.params.proposalId.toString() + "-" + event.params.voter.toHexString();
  let vote = new Vote(voteId);

  vote.proposal = event.params.proposalId.toString();
  vote.voter = event.params.voter;
  vote.support = event.params.support;
  vote.weight = event.params.weight;
  vote.reason = event.params.reason;
  vote.timestamp = event.block.timestamp;
  vote.save();

  // Update proposal vote counts
  let proposalId = event.params.proposalId.toString();
  let proposal = Proposal.load(proposalId);

  if (proposal) {
    if (event.params.support == 0) {
      proposal.againstVotes = proposal.againstVotes.plus(event.params.weight);
    } else if (event.params.support == 1) {
      proposal.forVotes = proposal.forVotes.plus(event.params.weight);
    } else if (event.params.support == 2) {
      proposal.abstainVotes = proposal.abstainVotes.plus(event.params.weight);
    }
    proposal.save();
  }

  // Increment votes counter
  incrementCounter("votes");
}

// Block handler to update time-based state transitions
export function handleBlock(block: ethereum.Block): void {
  let tracker = ActiveProposalTracker.load("1");
  if (!tracker) return;

  let proposalIds = tracker.activeProposals;
  let governorAddress = "0x91a8E4a070b4BA4BF2E2a51CB42BDEdf8fFb9B5a"; // Your governor address
  let governorContract = GovernorContract.bind(Address.fromString(governorAddress));

  for (let i = 0; i < proposalIds.length; i++) {
    let proposalId = proposalIds[i];
    let proposal = Proposal.load(proposalId);

    if (proposal) {
      // Check current state from contract
      let stateCall = governorContract.try_state(BigInt.fromString(proposalId));

      if (!stateCall.reverted) {
        let currentState = stateCall.value;
        let stateStr: string;

        // Map contract state enum to string
        if (currentState == 0) stateStr = "Pending";
        else if (currentState == 1) stateStr = "Active";
        else if (currentState == 2) stateStr = "Canceled";
        else if (currentState == 3) stateStr = "Defeated";
        else if (currentState == 4) stateStr = "Succeeded";
        else if (currentState == 5) stateStr = "Queued";
        else if (currentState == 6) stateStr = "Expired";
        else if (currentState == 7) stateStr = "Executed";
        else stateStr = "Unknown";

        // Only update if state has changed
        if (proposal.state != stateStr) {
          proposal.state = stateStr;
          proposal.save();

          // If terminal state, remove from active tracking
          if (stateStr == "Canceled" || stateStr == "Defeated" ||
            stateStr == "Executed" || stateStr == "Expired") {
            removeActiveProposal(proposalId);
          }
        }
      }
    }
  }
}

export function handleVoteCastWithParams(event: VoteCastWithParamsEvent): void {
  // This event is similar to VoteCast but with additional params
  // Create vote entity
  let voteId = event.params.proposalId.toString() + "-" + event.params.voter.toHexString();
  let vote = new Vote(voteId);

  vote.proposal = event.params.proposalId.toString();
  vote.voter = event.params.voter;
  vote.support = event.params.support;
  vote.weight = event.params.weight;
  vote.reason = event.params.reason;
  vote.timestamp = event.block.timestamp;
  vote.save();

  // Update proposal vote counts
  let proposalId = event.params.proposalId.toString();
  let proposal = Proposal.load(proposalId);

  if (proposal) {
    if (event.params.support == 0) {
      proposal.againstVotes = proposal.againstVotes.plus(event.params.weight);
    } else if (event.params.support == 1) {
      proposal.forVotes = proposal.forVotes.plus(event.params.weight);
    } else if (event.params.support == 2) {
      proposal.abstainVotes = proposal.abstainVotes.plus(event.params.weight);
    }
    proposal.save();
  }

  // Increment votes counter
  incrementCounter("votes");
}