pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";

contract EscrowTaskBoard is AragonApp {
    using SafeMath for uint256;

    enum State {
        //task has been created
        CREATED,
        //task has been canceled by creator
        STARTED,
        //task has been finished by worker
        FINISHED,
        //task has been accepted by creator -> amount of token has been sent to worker
        ACCEPTED,
        //task has been rejected by creator -> arbiter should decide what to do
        REJECTED,
        //task has been accepted by arbiter -> amount of token has been sent to worker
        ARBITER_ACCEPTED,
        //task has been rejected by arbiter -> amount of token has been sent to creator
        ARBITER_REJECTED,
        //task has been expired: creator hasn't selected bid or worker hasn't marked task as finished
        EXPIRED
    }

    struct Task {
        address creator;
        string description;
        address token;
        uint256 expirationTime;
        uint256 price;
        address worker;
        address arbiter; //TODO contract owner could be used
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

    mapping(bytes32 => Task) tasks;

    modifier isExist(bytes32 _name) {
        require(tasks[_name].creator != address(0), "Task not found");
        _;
    }

    event TaskCreated(bytes32 indexed _name, string _description, address _token, uint256 _expirationTime, address creator);
    event TaskRemoved(bytes32 indexed _name);


    //TODO add more events

    function initialize() public onlyInit {
        initialized();
    }

    function createTask(bytes32 _name, string _description, address _token, uint256 _expirationTime) external {
        require(_name != bytes32(0), "Invalid name");
        require(bytes(_description).length > 0, "Invalid description");
        require(_token != address(0), "Invalid token");
        require(_expirationTime > now, "Expiration time should be in the future");
        require(tasks[_name].creator == address(0), "Task already exists");

        Task memory task;
        task.creator = msg.sender;
        task.description =_description;
        task.token = _token;
        task.expirationTime = _expirationTime;
        task.state = State.CREATED;
        task.index = taskNames.length;
        tasks[_name] = task;
        taskNames.push(_name);

        emit TaskCreated(_name, _description, _token, _expirationTime, msg.sender);
    }

    function removeTask(bytes32 _name) isExist(_name) external {
        Task storage task = tasks[_name];
        require(task.creator == msg.sender, "You are not a creator of this task");
        require(task.state == State.CREATED, "Already started task can't be canceled");

        uint256 index = task.index;
        if (index != taskNames.length - 1) {
            taskNames[index] = taskNames[taskNames.length - 1];
            tasks[taskNames[index]].index = index;
        }
        taskNames.length--;
        delete task;

        emit TaskRemoved(_name);
    }

    function markAsExpired(bytes32 _name) external isExist(_name) {

    }

    function placeBid(bytes32 _taskName, uint256 _price, string _description, uint256 _implementationTime) external isExist(_taskName)  {
        Task storage task = tasks[_taskName];
        require(_price > 0, "Invalid price");
        require(bytes(_description).length > 0, "Invalid description");
        require(_implementationTime >= 1 days, "Implementation time should be at least one day");
        require(task.bids[msg.sender].price == 0, "You have already placed bid on this task");

        Bid memory bid;
        bid.price = _price;
        bid.description = _description;
        bid.implementationTime = _implementationTime;
        bid.index = task.bidders.length;
        task.bids[msg.sender] = bid;
        task.bidders.push(msg.sender);
    }

    function removeBid(bytes32 _taskName) external isExist(_taskName) {
        Task storage task = tasks[_taskName];
        require(task.bids[msg.sender].price > 0, "Bid not found");
        require(task.worker != msg.sender, "You have been already selected as a worker");

        uint256 index = task.bids[msg.sender].index;
        if (index != task.bidders.length - 1) {
            task.bidders[index] = task.bidders[task.bidders.length - 1];
            task.bids[task.bidders[index]].index = index;
        }
        task.bidders.length--;
        delete task.bids[msg.sender];
    }

    function selectBid(bytes32 _taskName, address bidder) external isExist(_taskName) {
        Task storage task = tasks[_taskName];
        require(task.creator == msg.sender, "You are not a creator of this task");
        require(task.bids[bidder].price > 0, "Bid not found");
        Bid storage bid = task.bids[bidder];
        require(ERC20(task.token).balanceOf(msg.sender) >= bid.price, "Balance is less than price");

        task.worker = bidder;
        task.expirationTime = now.add(bid.implementationTime);
        task.state = State.STARTED;
        task.price = bid.price;

        require(ERC20(task.token).transfer(this, bid.price), "Transfer failed");
    }

    function finishTask(bytes32 _taskName) external isExist(_taskName) {

    }

    function acceptTaskByCreator(bytes32 _taskName) external isExist(_taskName) {

    }

    function rejectTaskByCreator(bytes32 _taskName) external isExist(_taskName) {

    }

    function acceptTaskByArbiter(bytes32 _taskName) external isExist(_taskName) {

    }

    function rejectTaskByArbiter(bytes32 _taskName) external isExist(_taskName) {

    }

    function getBidders(bytes32 _taskName) external isExist(_taskName) returns (address[]) {

    }

    function getBid(bytes32 _taskName, address bidder) external isExist(_taskName) returns (address, uint256, string, uint256) {

    }

    function getCreatorTasks(address _creator, State _state) external returns (bytes32, string, address, uint256, address, address, address, State) {

    }

    function getWorkerTasks(address _creator, State _state) external returns (bytes32, string, address, uint256, address, address, address, State) {

    }

    function getRejectedTasks(address _creator, State _state) external returns (bytes32, string, address, uint256, address, address, address) {

    }


}
