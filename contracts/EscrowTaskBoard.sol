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
        uint256 amount;
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
    }

    bytes32[] public taskNames;

    mapping(bytes32 => Task) tasks;

    modifier isExist(bytes32 _name) {
        require(tasks[_name].creator != address(0), "Task not found");
        _;
    }

    event TaskCreated(bytes32 indexed _name, string _description, address _token, uint256 _expirationTime, address creator);
    event TaskRemoved(bytes32 _name);


    //TODO add more events

    function initialize() public onlyInit {
        initialized();
    }

    function createTask(bytes32 _name, string _description, address _token, uint256 _expirationTime) {
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

    function removeTask(bytes32 _name) isExist(_name) {
        require(tasks[_name].creator == msg.sender, "Only creator can cancel a task");
        require(tasks[_name].state == State.CREATED, "Already started task can't be canceled");

        uint256 index = tasks[_name].index;
        if (index != taskNames.length - 1) {
            taskNames[index] = taskNames[taskNames.length - 1];
            tasks[taskNames[index]].index = index;
        }
        taskNames.length--;
        delete tasks[_name];

        emit TaskRemoved(_name);
    }

    function markAsExpired(bytes32 _name) isExist(_name) {

    }

    function placeBid(bytes32 _taskName, uint256 _price, string _description) isExist(_taskName) {


    }

    function selectBid(bytes32 _taskName, address bidder) isExist(_taskName) {

    }

    function finishTask(bytes32 _taskName) isExist(_taskName) {

    }

    function acceptTaskByCreator(bytes32 _taskName) isExist(_taskName) {

    }

    function rejectTaskByCreator(bytes32 _taskName) isExist(_taskName) {

    }

    function acceptTaskByArbiter(bytes32 _taskName) isExist(_taskName) {

    }

    function rejectTaskByArbiter(bytes32 _taskName) isExist(_taskName) {

    }

    function getBidders(bytes32 _taskName) isExist(_taskName) returns (address[]) {

    }

    function getBid(bytes32 _taskName, address bidder) isExist(_taskName) returns (address, uint256, string, uint256) {

    }

    function getCreatorTasks(address _creator, State _state) returns (bytes32, string, address, uint256, address, address, address, State) {

    }

    function getWorkerTasks(address _creator, State _state) returns (bytes32, string, address, uint256, address, address, address, State) {

    }

    function getRejectedTasks(address _creator, State _state) returns (bytes32, string, address, uint256, address, address, address) {

    }


}
