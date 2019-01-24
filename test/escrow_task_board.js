const sha3 = require('solidity-sha3').default;

const {assertRevert} = require('@aragon/test-helpers/assertThrow');
const timeTravel = require('@aragon/test-helpers/timeTravel')(web3);
const getBlock = require('@aragon/test-helpers/block')(web3);
const getBlockNumber = require('@aragon/test-helpers/blockNumber')(web3);
const {encodeCallScript, EMPTY_SCRIPT} = require('@aragon/test-helpers/evmScript');
// const ExecutionTarget = artifacts.require('ExecutionTarget');

const DAOFactory = artifacts.require('@aragon/os/contracts/factory/DAOFactory');
const EVMScriptRegistryFactory = artifacts.require('@aragon/os/contracts/factory/EVMScriptRegistryFactory');
const ACL = artifacts.require('@aragon/os/contracts/acl/ACL');
const Kernel = artifacts.require('@aragon/os/contracts/kernel/Kernel');

const MiniMeToken = artifacts.require('@aragon/apps-shared-minime/contracts/MiniMeToken');

const getContract = name => artifacts.require(name);
// const bigExp = (x, y) => new web3.BigNumber(x).times(new web3.BigNumber(10).toPower(y));
// const pct16 = x => bigExp(x, 16);
// const startVoteEvent = receipt => receipt.logs.filter(x => x.event === 'StartVote')[0].args;
// const createdVoteId = receipt => startVoteEvent(receipt).voteId;

const Web3 = require('web3');
const web3Provider = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
const web3Utils = web3Provider.utils;

const EscrowTaskBoard = artifacts.require('EscrowTaskBoard');

const ANY_ADDRESS = '0xffffffffffffffffffffffffffffffffffffffff';
const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

const TASK_CREATED = 0;
const TASK_STARTED = 1;
const TASK_FINISHED = 2;
const TASK_ACCEPTED = 3;
const TASK_REJECTED = 4;
const TASK_ACCEPTED_BY_ARBITER = 5;
const TASK_REJECTED_BY_ARBITER = 6;
const TASK_EXPIRED = 7;

contract('Escrow Task Board App', (accounts) => {
    let taskBoardBase, daoFact, taskBoard, token, executionTarget;

    let APP_MANAGER_ROLE;
    let ARBITER_ROLE;

    const root = accounts[0];
    const accountClient = accounts[1];
    const accountWorker = accounts[2];

    let now;

    const day = 60 * 60 * 24;

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
        await taskBoard.initialize();

        //TODO ANY_ADDRESS ?
        await acl.createPermission(ANY_ADDRESS, taskBoard.address, ARBITER_ROLE, root, {from: root});
    });

    context('task creation tests', () => {

        beforeEach(async () => {
            token = await MiniMeToken.new(NULL_ADDRESS, NULL_ADDRESS, 0, 'n', 0, 'n', true); // empty parameters minime

            await token.generateTokens(accountClient, 1000);

            now = (await getBlock(await getBlockNumber())).timestamp;
        });

        it('creates task', async () => {
            let taskName = "task01";
            let taskDescription = "task description";
            const tx = await taskBoard.createTask(taskName, taskDescription, token.address, day, {from: accountClient});
            const event = tx.logs[0].args;

            assert.equal(web3Utils.toUtf8(event._name), taskName);
            assert.equal(event._description, taskDescription);
            assert.equal(event._token, token.address);
            assert.equal(event._expirationTime, day);
            assert.equal(event._client, accountClient);

            await checkTask(taskBoard, taskName, accountClient, taskDescription, token, now + day, 0, NULL_ADDRESS, TASK_CREATED);
        })


    });

    const checkTask = async(taskBoard, name, client, description, token, expiration, price, worker, state) => {
        const task = await taskBoard.getTask.call(name);
        assert.equal(task[0], client);
        assert.equal(task[1], description);
        assert.equal(task[2], token.address);
        assert.equal(task[3].toNumber(), expiration);
        assert.equal(task[4], price);
        assert.equal(task[5], worker);
        assert.equal(task[6].toNumber(), state);
    }

});

