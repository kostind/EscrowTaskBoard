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

const ERROR_TASK_NOT_FOUND = "TASK_NOT_FOUND";
const ERROR_IS_NOT_A_CLIENT = "IS_NOT_A_CLIENT";
const ERROR_INVALID_NAME = "INVALID_NAME";
const ERROR_INVALID_DESCRIPTION = "INVALID_DESCRIPTION";
const ERROR_INVALID_TOKEN = "INVALID_TOKEN";
const ERROR_INVALID_EXPIRATION_TIME = "INVALID_EXPIRATION_TIME";
const ERROR_TASK_ALREADY_EXISTS = "TASK_ALREADY_EXISTS";
const ERROR_TASK_ALREADY_STARTED = "TASK_ALREADY_STARTED";
const ERROR_INVALID_PRICE = "INVALID_PRICE";
const ERROR_INVALID_IMPLEMENTATION_TIME = "INVALID_IMPLEMENTATION_TIME";
const ERROR_BID_ALREADY_PLACED = "BID_ALREADY_PLACED";
const ERROR_BID_NOT_FOUND = "BID_NOT_FOUND";
const ERROR_SELECTED_AS_A_WORKER = "SELECTED_AS_A_WORKER";
const ERROR_BALANCE_IS_NOT_ENOUGH = "BALANCE_IS_NOT_ENOUGH";
const ERROR_TRANSFER_FAILED = "TRANSFER_FAILED";
const ERROR_NOT_A_WORKER = "NOT_A_WORKER";
const ERROR_TASK_NOT_STARTED = "TASK_NOT_STARTED";
const ERROR_TASK_NOT_FINISHED = "TASK_NOT_FINISHED";
const ERROR_TASK_NOT_REJECTED = "TASK_NOT_REJECTED";
const ERROR_WORKER_STILL_HAS_TIME = "WORKER_STILL_HAS_TIME";

contract('Escrow Task Board App', (accounts) => {
    let taskBoardBase, daoFact, taskBoard, token, executionTarget;

    let APP_MANAGER_ROLE;
    let ARBITER_ROLE;

    const root = accounts[0];
    const accountClient = accounts[1];
    const accountWorker = accounts[2];

    let now;

    const DAY = 60 * 60 * 24;

    before(async () => {
        const kernelBase = await getContract('Kernel').new(true);// petrify immediately
        const aclBase = await getContract('ACL').new();
        const regFact = await EVMScriptRegistryFactory.new();
        daoFact = await DAOFactory.new(kernelBase.address, aclBase.address, regFact.address);
        taskBoardBase = await EscrowTaskBoard.new();

        // Setup constants
        APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE();
        ARBITER_ROLE = await taskBoardBase.ARBITER_ROLE();

        token = await MiniMeToken.new(NULL_ADDRESS, NULL_ADDRESS, 0, 'n', 0, 'n', true); // empty parameters minime

        await token.generateTokens(accountClient, 1000);

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

    beforeEach(async () => {
        //TODO remove ?
        now = (await getBlock(await getBlockNumber())).timestamp;
    });

    context('task creation tests', () => {

        it('creates first task', async () => {
            const taskName = "task01";
            const taskDescription = "task description";
            const tx = await taskBoard.createTask(taskName, taskDescription, token.address, DAY, {from: accountClient});
            const args = tx.logs.filter(log => log.event === 'TaskCreated')[0].args;

            assert.equal(web3Utils.toUtf8(args._name), taskName);
            assert.equal(args._description, taskDescription);
            assert.equal(args._token, token.address);
            assert.equal(args._expirationTime, DAY);
            assert.equal(args._client, accountClient);

            await checkTask(taskBoard, taskName, accountClient, taskDescription, token, DAY, 0, NULL_ADDRESS, TASK_CREATED);
        });

        it('creates second task', async () => {
            const taskName = "task02";
            const taskDescription = "task 2 description";
            const tx = await taskBoard.createTask(taskName, taskDescription, token.address, DAY, {from: accountClient});
            const args = tx.logs.filter(log => log.event === 'TaskCreated')[0].args;

            assert.equal(web3Utils.toUtf8(args._name), taskName);
            assert.equal(args._description, taskDescription);
            assert.equal(args._token, token.address);
            assert.equal(args._expirationTime, DAY);
            assert.equal(args._client, accountClient);

            await checkTask(taskBoard, taskName, accountClient, taskDescription, token, DAY, 0, NULL_ADDRESS, TASK_CREATED);
        });

        it('creates third task', async () => {
            const taskName = "task03";
            const taskDescription = "task 3 description";
            const tx = await taskBoard.createTask(taskName, taskDescription, token.address, DAY, {from: accountClient});
            const args = tx.logs.filter(log => log.event === 'TaskCreated')[0].args;

            assert.equal(web3Utils.toUtf8(args._name), taskName);
            assert.equal(args._description, taskDescription);
            assert.equal(args._token, token.address);
            assert.equal(args._expirationTime, DAY);
            assert.equal(args._client, accountClient);

            await checkTask(taskBoard, taskName, accountClient, taskDescription, token, DAY, 0, NULL_ADDRESS, TASK_CREATED);
        });

        it('removes task', async () => {
            const taskName = "task01";
            const tx = await taskBoard.removeTask(taskName, {from: accountClient});
            const args = tx.logs.filter(log => log.event === 'TaskRemoved')[0].args;

            assert.equal(web3Utils.toUtf8(args._name), taskName);

            return assertRevert(async () => {
                await taskBoard.getTask.call(taskName);
            });
        });

    });

    context('bid placement tests', () => {

        it('places bid', async () => {
            const taskName = "task02";
            const bidDescription = "bid description";
            const bidPrice = 125;
            const bidTime = 2 * DAY;
            const tx = await taskBoard.placeBid(taskName, bidPrice, bidDescription, bidTime, {from: accountWorker});
            const args = tx.logs.filter(log => log.event === 'BidPlaced')[0].args;

            assert.equal(web3Utils.toUtf8(args._taskName), taskName);
            assert.equal(args._price, bidPrice);
            assert.equal(args._description, bidDescription);
            assert.equal(args._implementationTime, bidTime);
            assert.equal(args._bidder, accountWorker);

            const bid = await taskBoard.getBid.call(taskName, accountWorker);
            assert.equal(bid[0], bidPrice);
            assert.equal(bid[1], bidDescription);
            assert.equal(bid[2].toNumber(), bidTime);
        });

        it('removes bid', async () => {
            const taskName = "task02";
            const tx = await taskBoard.removeBid(taskName, {from: accountWorker});
            const args = tx.logs.filter(log => log.event === 'BidRemoved')[0].args;

            assert.equal(web3Utils.toUtf8(args._taskName), taskName);
            assert.equal(args._bidder, accountWorker);

            return assertRevert(async () => {
                await taskBoard.getBid.call(taskName, accountWorker);
            });
        });

        it('selects bid', async () => {
            const taskName = "task02";
            const bidDescription = "bid description";
            const bidPrice = 125;
            const bidTime = 2 * DAY;
            await taskBoard.placeBid(taskName, bidPrice, bidDescription, bidTime, {from: accountWorker});

            const balance = await token.balanceOf.call(taskBoard.address);
            const clientBalance = await token.balanceOf.call(accountClient);

            await token.approve(taskBoard.address, bidPrice, {from: accountClient});
            const tx = await taskBoard.selectBid(taskName, accountWorker, {from: accountClient});
            const args = tx.logs.filter(log => log.event === 'BidSelected')[0].args;
            assert.equal(web3Utils.toUtf8(args._taskName), taskName);
            assert.equal(args._bidder, accountWorker);

            const newBalance = await token.balanceOf.call(taskBoard.address);
            const newClientBalance = await token.balanceOf.call(accountClient);
            assert.equal(newBalance - balance, bidPrice);
            assert.equal(clientBalance - newClientBalance, bidPrice);

            const taskDescription = "task 2 description";
            await checkTask(taskBoard, taskName, accountClient, taskDescription, token, bidTime, bidPrice, accountWorker, TASK_STARTED);
        });

    });

    context('task processing tests', () => {

        it('finishes task', async () => {
            const taskName = "task02";
            const tx = await taskBoard.finishTask(taskName, {from: accountWorker});
            const args = tx.logs.filter(log => log.event === 'TaskFinished')[0].args;
            assert.equal(web3Utils.toUtf8(args._name), taskName);

            const taskDescription = "task 2 description";
            const bidPrice = 125;
            const bidTime = 2 * DAY;
            await checkTask(taskBoard, taskName, accountClient, taskDescription, token, 0, bidPrice, accountWorker, TASK_FINISHED);
        });

        it('accepts task by client', async () => {
            const balance = await token.balanceOf.call(taskBoard.address);
            const workerBalance = await token.balanceOf.call(accountWorker);

            const taskName = "task02";
            const bidPrice = 125;
            const bidTime = 2 * DAY;
            const tx = await taskBoard.acceptTaskByClient(taskName, {from: accountClient});
            const args = tx.logs.filter(log => log.event === 'TaskAcceptedByClient')[0].args;
            assert.equal(web3Utils.toUtf8(args._name), taskName);

            const newBalance = await token.balanceOf.call(taskBoard.address);
            const newWorkerBalance = await token.balanceOf.call(accountWorker);
            assert.equal(balance - newBalance, bidPrice);
            assert.equal(newWorkerBalance - workerBalance, bidPrice);

            const taskDescription = "task 2 description";
            await checkTask(taskBoard, taskName, accountClient, taskDescription, token, 0, bidPrice, accountWorker, TASK_ACCEPTED);
        });

        it('rejects task by client', async () => {
            const taskName = "task11";
            const taskDescription = "task 11 description";
            await taskBoard.createTask(taskName, taskDescription, token.address, 5 * DAY, {from: accountClient});

            const bidPrice = 275;
            const bidTime = 11 * DAY;
            const bidDescription = "bid for task 11";
            await taskBoard.placeBid(taskName, bidPrice, bidDescription, bidTime, {from: accountWorker});

            await token.approve(taskBoard.address, bidPrice, {from: accountClient});
            await taskBoard.selectBid(taskName, accountWorker, {from: accountClient});

            await taskBoard.finishTask(taskName, {from: accountWorker});

            const tx = await taskBoard.rejectTaskByClient(taskName, {from: accountClient});
            const args = tx.logs.filter(log => log.event === 'TaskRejectedByClient')[0].args;
            assert.equal(web3Utils.toUtf8(args._name), taskName);

            await checkTask(taskBoard, taskName, accountClient, taskDescription, token, 0, bidPrice, accountWorker, TASK_REJECTED);
        });

        it('marks task as expired', async () => {
            const taskName = "task12";
            const taskDescription = "task 12 description";
            await taskBoard.createTask(taskName, taskDescription, token.address, DAY, {from: accountClient});

            const bidPrice = 158;
            const bidTime = 2 * DAY;
            const bidDescription = "bid for task 12";
            await taskBoard.placeBid(taskName, bidPrice, bidDescription, bidTime, {from: accountWorker});

            await token.approve(taskBoard.address, bidPrice, {from: accountClient});
            await taskBoard.selectBid(taskName, accountWorker, {from: accountClient});

            const balance = await token.balanceOf.call(taskBoard.address);
            const clientBalance = await token.balanceOf.call(accountClient);

            await timeTravel(bidTime + 1);

            const tx = await taskBoard.markTaskAsExpired(taskName, {from: accountClient});
            const args = tx.logs.filter(log => log.event === 'TaskExpired')[0].args;
            assert.equal(web3Utils.toUtf8(args._name), taskName);

            const newBalance = await token.balanceOf.call(taskBoard.address);
            const newClientBalance = await token.balanceOf.call(accountClient);
            assert.equal(balance - newBalance, bidPrice);
            assert.equal(newClientBalance - clientBalance, bidPrice);

            await checkTask(taskBoard, taskName, accountClient, taskDescription, token, 0, bidPrice, accountWorker, TASK_EXPIRED);
        });

        it('accepts task by arbiter', async () => {
            const taskName = "task13";
            const taskDescription = "task 13 description";
            await taskBoard.createTask(taskName, taskDescription, token.address, DAY, {from: accountClient});

            const bidPrice = 158;
            const bidTime = 2 * DAY;
            const bidDescription = "bid for task 13";
            await taskBoard.placeBid(taskName, bidPrice, bidDescription, bidTime, {from: accountWorker});

            await token.approve(taskBoard.address, bidPrice, {from: accountClient});
            await taskBoard.selectBid(taskName, accountWorker, {from: accountClient});

            await taskBoard.finishTask(taskName, {from: accountWorker});
            await taskBoard.rejectTaskByClient(taskName, {from: accountClient});

            const balance = await token.balanceOf.call(taskBoard.address);
            const workerBalance = await token.balanceOf.call(accountWorker);

            const tx = await taskBoard.acceptTaskByArbiter(taskName, {from: root});
            const args = tx.logs.filter(log => log.event === 'TaskAcceptedByArbiter')[0].args;
            assert.equal(web3Utils.toUtf8(args._name), taskName);

            const newBalance = await token.balanceOf.call(taskBoard.address);
            const newWorkerBalance = await token.balanceOf.call(accountWorker);
            assert.equal(balance - newBalance, bidPrice);
            assert.equal(newWorkerBalance - workerBalance, bidPrice);

            await checkTask(taskBoard, taskName, accountClient, taskDescription, token, 0, bidPrice, accountWorker, TASK_ACCEPTED_BY_ARBITER);
        });

        it('rejects task by arbiter', async () => {
            const taskName = "task14";
            const taskDescription = "task 14 description";
            await taskBoard.createTask(taskName, taskDescription, token.address, DAY, {from: accountClient});

            const bidPrice = 158;
            const bidTime = 2 * DAY;
            const bidDescription = "bid for task 14";
            await taskBoard.placeBid(taskName, bidPrice, bidDescription, bidTime, {from: accountWorker});

            await token.approve(taskBoard.address, bidPrice, {from: accountClient});
            await taskBoard.selectBid(taskName, accountWorker, {from: accountClient});

            await taskBoard.finishTask(taskName, {from: accountWorker});
            await taskBoard.rejectTaskByClient(taskName, {from: accountClient});

            const balance = await token.balanceOf.call(taskBoard.address);
            const clientBalance = await token.balanceOf.call(accountClient);

            const tx = await taskBoard.rejectTaskByArbiter(taskName, {from: root});
            const args = tx.logs.filter(log => log.event === 'TaskRejectedByArbiter')[0].args;
            assert.equal(web3Utils.toUtf8(args._name), taskName);

            const newBalance = await token.balanceOf.call(taskBoard.address);
            const newClientBalance = await token.balanceOf.call(accountClient);
            assert.equal(balance - newBalance, bidPrice);
            assert.equal(newClientBalance - clientBalance, bidPrice);

            await checkTask(taskBoard, taskName, accountClient, taskDescription, token, 0, bidPrice, accountWorker, TASK_REJECTED_BY_ARBITER);
        });

    });

    const checkTask = async(taskBoard, name, client, description, token, expiration, price, worker, state) => {
        const task = await taskBoard.getTask.call(name);

        now = (await getBlock(await getBlockNumber())).timestamp;

        assert.equal(task[0], client);
        assert.equal(task[1], description);
        assert.equal(task[2], token.address);
        if (expiration !== 0) {
            assert.equal(task[3].toNumber(), now + expiration);
        }
        assert.equal(task[4], price);
        assert.equal(task[5], worker);
        assert.equal(task[6].toNumber(), state);
    }

});
