const sha3 = require('solidity-sha3').default;

const {assertRevert} = require('@aragon/test-helpers/assertThrow');
const getBlockNumber = require('@aragon/test-helpers/blockNumber')(web3);
const timeTravel = require('@aragon/test-helpers/timeTravel')(web3);
const {encodeCallScript, EMPTY_SCRIPT} = require('@aragon/test-helpers/evmScript');
// const ExecutionTarget = artifacts.require('ExecutionTarget');

const DAOFactory = artifacts.require('@aragon/os/contracts/factory/DAOFactory');
const EVMScriptRegistryFactory = artifacts.require('@aragon/os/contracts/factory/EVMScriptRegistryFactory');
const ACL = artifacts.require('@aragon/os/contracts/acl/ACL');
const Kernel = artifacts.require('@aragon/os/contracts/kernel/Kernel');

// const MiniMeToken = artifacts.require('@aragon/apps-shared-minime/contracts/MiniMeToken');

const getContract = name => artifacts.require(name);
const bigExp = (x, y) => new web3.BigNumber(x).times(new web3.BigNumber(10).toPower(y));
const pct16 = x => bigExp(x, 16);
const startVoteEvent = receipt => receipt.logs.filter(x => x.event === 'StartVote')[0].args;
const createdVoteId = receipt => startVoteEvent(receipt).voteId;

const EscrowTaskBoard = artifacts.require('EscrowTaskBoard');

const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff';
const NULL_ADDRESS = '0x00';


contract('Escrow Task Board App', (accounts) => {
    let taskBoardBase, daoFact, taskBoard, token, executionTarget;

    let APP_MANAGER_ROLE;
    let ARBITER_ROLE;

    const root = accounts[0];

    before(async () => {
        const kernelBase = await getContract('Kernel').new(true);// petrify immediately
        const aclBase = await getContract('ACL').new();
        const regFact = await EVMScriptRegistryFactory.new();
        daoFact = await DAOFactory.new(kernelBase.address, aclBase.address, regFact.address);
        taskBoardBase = await EscrowTaskBoard.new();

        // Setup constants
        APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE();
        ARBITER_ROLE = await taskBoardBase.ARBITER_ROLE();
    });

    beforeEach(async () => {
        const r = await daoFact.newDAO(root);
        const dao = Kernel.at(r.logs.filter(l => l.event === 'DeployDAO')[0].args.dao);
        const acl = ACL.at(await dao.acl());

        await acl.createPermission(root, dao.address, APP_MANAGER_ROLE, root, {from: root});

        const receipt = await dao.newAppInstance('0x1234', taskBoardBase.address, '0x', false, {from: root});
        taskBoard = EscrowTaskBoard.at(receipt.logs.filter(l => l.event === 'NewAppProxy')[0].args.proxy);

        //TODO ANY_ADDR ?
        await acl.createPermission(ANY_ADDR, taskBoard.address, ARBITER_ROLE, root, {from: root});
    });

    it('should be tested')
});
