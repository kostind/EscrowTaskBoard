pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";

//TODO add docs

contract EscrowTaskBoard is AragonApp {
    using SafeMath for uint256;

    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");

    //TODO commented because of contract size
//    string private constant "ERROR_TASK_NOT_FOUND = "TASK_NOT_FOUND";
//    string private constant "ERROR_IS_NOT_A_CLIENT = "IS_NOT_A_CLIENT";
//    string private constant "ERROR_INVALID_NAME = "INVALID_NAME";
//    string private constant "ERROR_INVALID_DESCRIPTION = "INVALID_DESCRIPTION";
//    string private constant "ERROR_INVALID_TOKEN = "INVALID_TOKEN";
//    string private constant "ERROR_INVALID_EXPIRATION_TIME = "INVALID_EXPIRATION_TIME";
//    string private constant "ERROR_TASK_ALREADY_EXISTS = "TASK_ALREADY_EXISTS";
//    string private constant "ERROR_TASK_ALREADY_STARTED = "TASK_ALREADY_STARTED";
//    string private constant "ERROR_INVALID_PRICE = "INVALID_PRICE";
//    string private constant "ERROR_INVALID_IMPLEMENTATION_TIME = "INVALID_IMPLEMENTATION_TIME";
//    string private constant "ERROR_BID_ALREADY_PLACED = "BID_ALREADY_PLACED";
//    string private constant "ERROR_BID_NOT_FOUND = "BID_NOT_FOUND";
//    string private constant "ERROR_SELECTED_AS_A_WORKER = "SELECTED_AS_A_WORKER";
//    string private constant "ERROR_BALANCE_IS_NOT_ENOUGH = "BALANCE_IS_NOT_ENOUGH";
//    string private constant "ERROR_TRANSFER_FAILED = "TRANSFER_FAILED";
//    string private constant "ERROR_NOT_A_WORKER = "NOT_A_WORKER";
//    string private constant "ERROR_TASK_NOT_STARTED = "TASK_NOT_STARTED";
//    string private constant "ERROR_TASK_NOT_FINISHED = "TASK_NOT_FINISHED";
//    string private constant "ERROR_TASK_NOT_REJECTED = "TASK_NOT_REJECTED";
//    string private constant "ERROR_WORKER_STILL_HAS_TIME = "WORKER_STILL_HAS_TIME";

    enum State {
        //task has been created
        CREATED,
        //task has been canceled by client
        STARTED,
        //task has been finished by worker
        FINISHED,
        //task has been accepted by client -> amount of token has been sent to worker
        ACCEPTED,
        //task has been rejected by client -> arbiter should decide what to do
        REJECTED,
        //task has been accepted by arbiter -> amount of token has been sent to worker
        ACCEPTED_BY_ARBITER,
        //task has been rejected by arbiter -> amount of token has been sent to client
        REJECTED_BY_ARBITER,
        //task has been expired: client hasn't selected bid or worker hasn't marked task as finished
        EXPIRED
    }

    struct Task {
        address client;
        string description;
        address token;
        uint256 expirationTime;
        uint256 price;
        address worker;
        address[] bidders;
        mapping (address => Bid) bids;
        State state;
        uint256 index;
    }

    struct Bid {
        uint256 price;
        string description;
        uint256 implementationTime;
        uint256 index;
    }

    bytes32[] public taskNames;

    mapping(bytes32 => Task) internal tasks;

    mapping(address => bytes32[]) public clientTasks;
    mapping(address => mapping(bytes32 => uint256)) internal clientTaskIndexes;

    mapping(address => bytes32[]) public workerTasks;

    modifier isExist(bytes32 _name) {
        require(tasks[_name].client != address(0), "ERROR_TASK_NOT_FOUND");
        _;
    }

    modifier isClient(bytes32 _name) {
        require(tasks[_name].client == msg.sender, "ERROR_IS_NOT_A_CLIENT");
        _;
    }

    event TaskCreated(bytes32 indexed _name, string _description, address _token, uint256 _expirationTime, address indexed _client);
    event TaskRemoved(bytes32 indexed _name);
    event BidPlaced(bytes32 indexed _taskName, uint256 _price, string _description, uint256 _implementationTime, address indexed _bidder);
    event BidRemoved(bytes32 indexed _taskName, address indexed _bidder);
    event BidSelected(bytes32 indexed _taskName, address indexed _bidder);
    event TaskFinished(bytes32 indexed _name);
    event TaskExpired(bytes32 indexed _name);
    event TaskAcceptedByClient(bytes32 indexed _name);
    event TaskRejectedByClient(bytes32 indexed _name);
    event TaskAcceptedByArbiter(bytes32 indexed _name);
    event TaskRejectedByArbiter(bytes32 indexed _name);

    function initialize() public onlyInit {
        initialized();
    }

    function createTask(bytes32 _name, string _description, address _token, uint256 _expirationTime) external {
        require(_name != bytes32(0), "ERROR_INVALID_NAME");
        require(bytes(_description).length > 0, "ERROR_INVALID_DESCRIPTION");
        require(_token != address(0), "ERROR_INVALID_TOKEN");
        require(_expirationTime >= 1 days, "ERROR_INVALID_EXPIRATION_TIME");
        require(tasks[_name].client == address(0), "ERROR_TASK_ALREADY_EXISTS");

        Task memory task;
        task.client = msg.sender;
        task.description =_description;
        task.token = _token;
        task.expirationTime = now.add(_expirationTime);
        task.state = State.CREATED;
        task.index = taskNames.length;
        tasks[_name] = task;
        taskNames.push(_name);
        clientTaskIndexes[msg.sender][_name] = clientTasks[msg.sender].length;
        clientTasks[msg.sender].push(_name);

        emit TaskCreated(_name, _description, _token, _expirationTime, msg.sender);
    }

    function removeTask(bytes32 _name) isExist(_name) isClient(_name) external {
        Task storage task = tasks[_name];
        require(task.state == State.CREATED, "ERROR_TASK_ALREADY_STARTED");

        uint256 index = task.index;
        if (index != taskNames.length - 1) {
            taskNames[index] = taskNames[taskNames.length - 1];
            tasks[taskNames[index]].index = index;
        }
        taskNames.length--;
        delete tasks[_name];
        removeClientTask(_name, msg.sender);

        emit TaskRemoved(_name);
    }

    function removeClientTask(bytes32 _name, address _client) private {
        uint256 index = clientTaskIndexes[_client][_name];
        uint256 lastIndex = clientTasks[_client].length - 1;
        if (index != lastIndex) {
            clientTasks[_client][index] = clientTasks[_client][lastIndex];
        }
        clientTasks[_client].length--;
        delete clientTaskIndexes[_client][_name];
    }

    function placeBid(bytes32 _taskName, uint256 _price, string _description, uint256 _implementationTime) external isExist(_taskName)  {
        Task storage task = tasks[_taskName];
        require(_price > 0, "ERROR_INVALID_PRICE");
        require(bytes(_description).length > 0, "ERROR_INVALID_DESCRIPTION");
        require(_implementationTime >= 1 days, "ERROR_INVALID_IMPLEMENTATION_TIME");
        require(task.bids[msg.sender].price == 0, "ERROR_BID_ALREADY_PLACED");

        Bid memory bid;
        bid.price = _price;
        bid.description = _description;
        bid.implementationTime = _implementationTime;
        bid.index = task.bidders.length;
        task.bids[msg.sender] = bid;
        task.bidders.push(msg.sender);

        emit BidPlaced(_taskName, _price, _description, _implementationTime, msg.sender);
    }

    function removeBid(bytes32 _taskName) external isExist(_taskName) {
        Task storage task = tasks[_taskName];
        require(task.bids[msg.sender].price > 0, "ERROR_BID_NOT_FOUND");
        require(task.worker != msg.sender, "ERROR_SELECTED_AS_A_WORKER");

        uint256 index = task.bids[msg.sender].index;
        if (index != task.bidders.length - 1) {
            task.bidders[index] = task.bidders[task.bidders.length - 1];
            task.bids[task.bidders[index]].index = index;
        }
        task.bidders.length--;
        delete task.bids[msg.sender];

        emit BidRemoved(_taskName, msg.sender);
    }

    function selectBid(bytes32 _taskName, address bidder) external isExist(_taskName) isClient(_taskName) {
        Task storage task = tasks[_taskName];
        require(task.bids[bidder].price > 0, "ERROR_BID_NOT_FOUND");
        Bid storage bid = task.bids[bidder];
        require(ERC20(task.token).balanceOf(msg.sender) >= bid.price, "ERROR_BALANCE_IS_NOT_ENOUGH");

        task.worker = bidder;
        task.expirationTime = now.add(bid.implementationTime);
        task.state = State.STARTED;
        task.price = bid.price;
        workerTasks[bidder].push(_taskName);
        require(ERC20(task.token).transferFrom(msg.sender, this, task.price), "ERROR_TRANSFER_FAILED");

        emit BidSelected(_taskName, bidder);
    }

    function finishTask(bytes32 _name) external isExist(_name) {
        Task storage task = tasks[_name];
        require(task.worker == msg.sender, "ERROR_NOT_A_WORKER");
        require(task.state == State.STARTED, "ERROR_TASK_NOT_STARTED");

        task.state = State.FINISHED;
        emit TaskFinished(_name);
    }

    function markTaskAsExpired(bytes32 _name) external isExist(_name) isClient(_name) {
        Task storage task = tasks[_name];
        require(task.state == State.STARTED, "ERROR_TASK_NOT_STARTED");
        require(now > task.expirationTime, "ERROR_WORKER_STILL_HAS_TIME");

        task.state = State.EXPIRED;
        require(ERC20(task.token).transfer(task.client, task.price), "ERROR_TRANSFER_FAILED");
        emit TaskExpired(_name);
    }

    function acceptTaskByClient(bytes32 _name) external isExist(_name) isClient(_name) {
        Task storage task = tasks[_name];
        require(task.state == State.FINISHED, "ERROR_TASK_NOT_FINISHED");

        task.state = State.ACCEPTED;
        require(ERC20(task.token).transfer(task.worker, task.price), "ERROR_TRANSFER_FAILED");
        emit TaskAcceptedByClient(_name);
    }

    function rejectTaskByClient(bytes32 _name) external isExist(_name) isClient(_name) {
        Task storage task = tasks[_name];
        require(task.state == State.FINISHED, "ERROR_TASK_NOT_FINISHED");

        task.state = State.REJECTED;
        emit TaskRejectedByClient(_name);
    }

    function acceptTaskByArbiter(bytes32 _name) external isExist(_name) auth(ARBITER_ROLE) {
        Task storage task = tasks[_name];
        require(task.state == State.REJECTED, "ERROR_TASK_NOT_REJECTED");

        task.state = State.ACCEPTED_BY_ARBITER;
        require(ERC20(task.token).transfer(task.worker, task.price), "ERROR_TRANSFER_FAILED");
        emit TaskAcceptedByArbiter(_name);
    }

    function rejectTaskByArbiter(bytes32 _name) external isExist(_name) auth(ARBITER_ROLE) {
        Task storage task = tasks[_name];
        require(task.state == State.REJECTED, "ERROR_TASK_NOT_REJECTED");

        task.state = State.REJECTED_BY_ARBITER;
        require(ERC20(task.token).transfer(task.client, task.price), "ERROR_TRANSFER_FAILED");
        emit TaskRejectedByArbiter(_name);
    }

    function getTask(bytes32 _name) external view isExist(_name) returns (address, string, address, uint256, uint256, address, State) {
        Task storage task = tasks[_name];
        return (task.client, task.description, task.token, task.expirationTime, task.price, task.worker, task.state);
    }

    function getBidders(bytes32 _name) external view isExist(_name) returns (address[]) {
        return tasks[_name].bidders;
    }

    function getBid(bytes32 _name, address bidder) external view isExist(_name) returns (uint256, string, uint256) {
        Task storage task = tasks[_name];
        require(task.bids[bidder].price > 0, "ERROR_BID_NOT_FOUND");
        Bid storage bid = task.bids[bidder];
        return (bid.price, bid.description, bid.implementationTime);
    }

}
