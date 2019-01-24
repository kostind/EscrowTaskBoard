const sha3 = require('solidity-sha3').default;

const { assertRevert } = require('@aragon/test-helpers/assertThrow');
const getBlockNumber = require('@aragon/test-helpers/blockNumber')(web3);
const timeTravel = require('@aragon/test-helpers/timeTravel')(web3);
const { encodeCallScript, EMPTY_SCRIPT } = require('@aragon/test-helpers/evmScript');
// const ExecutionTarget = artifacts.require('ExecutionTarget');

const DAOFactory = artifacts.require('@aragon/os/contracts/factory/DAOFactory');
const EVMScriptRegistryFactory = artifacts.require('@aragon/os/contracts/factory/EVMScriptRegistryFactory');
const ACL = artifacts.require('@aragon/os/contracts/acl/ACL');
const Kernel = artifacts.require('@aragon/os/contracts/kernel/Kernel');

// const MiniMeToken = artifacts.require('@aragon/apps-shared-minime/contracts/MiniMeToken');

const getContract = name => artifacts.require(name);
const bigExp = (x, y) => new web3.BigNumber(x).times(new web3.BigNumber(10).toPower(y));
const pct16 = x => bigExp(x, 16);
const startVoteEvent = receipt => receipt.logs.filter(x => x.event == 'StartVote')[0].args;
const createdVoteId = receipt => startVoteEvent(receipt).voteId;

const EscrowTaskBoard = artifacts.require('EscrowTaskBoard');

const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff';
const NULL_ADDRESS = '0x00';



contract('Escrow_task_board', (accounts) => {

  before(async () => {
    const kernelBase = await getContract('Kernel').new(true) // petrify immediately
    const aclBase = await getContract('ACL').new()
    const regFact = await EVMScriptRegistryFactory.new()
    // daoFact = await DAOFactory.new(kernelBase.address, aclBase.address, regFact.address)
    // votingBase = await Voting.new()
    //
    // // Setup constants
    // APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()
    // CREATE_VOTES_ROLE = await votingBase.CREATE_VOTES_ROLE()
    // MODIFY_SUPPORT_ROLE = await votingBase.MODIFY_SUPPORT_ROLE()
    // MODIFY_QUORUM_ROLE = await votingBase.MODIFY_QUORUM_ROLE()
  })

  it('should be tested')
});
