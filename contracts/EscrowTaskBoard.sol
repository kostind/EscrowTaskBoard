pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";

contract EscrowTaskBoard is AragonApp {
    using SafeMath for uint256;

    enum State {
        //task has been created
        Created,
        //task has been canceled by creator
        Canceled,
        //bid has been accepted by creator -> task has been started
        Started,
        //task has been finished by worker
        Finished,
        //task has been accepted by creator -> amount of token has been sent to worker
        Accepted,
        //task has been rejected by creator -> arbiter should decide what to do
        Rejected,
        //task has been accepted by arbiter -> amount of token has been sent to worker
        Arbiter_Accepted,
        //task has been rejected by arbiter -> amount of token has been sent to creator
        Arbiter_Rejected,
        //task has been expired: creator hasn't selected bid or worker hasn't marked task as finished
        Expired
    }

    struct Task {
        bytes32 name;
        string description;
        address token;
        uint256 amount;
        uint256 expirationTime;
        address creator;
        address worker;
        address arbiter; //TODO contract owner could be used
        address[] bidders;
        mapping (address => Bid) bids;
        State state;
    }

    struct Bid {
        uint256 price;
        string description;
        uint256 implementationTime;
    }

    bytes32[] public taskNames;

    mapping(bytes32 => Task) tasks;


    function initialize() public onlyInit {
        initialized();
    }

    function createTask(bytes32 _name, string _description, address _token, uint256 _expirationTime) {

    }

    function cancelTask(bytes32 _name) {

    }

    function placeBid(bytes32 _taskName, uint256 _price, string _description) {

    }

    function selectBid(bytes32 _taskName, address bidder) {

    }

    function finishTask(bytes32 _taskName) {

    }

    function acceptTaskByCreator(bytes32 _taskName) {

    }

    function rejectTaskByCreator(bytes32 _taskName) {

    }

    function acceptTaskByArbiter(bytes32 _taskName) {

    }

    function rejectTaskByArbiter(bytes32 _taskName) {

    }

    function getBidders(bytes32 _taskName) returns (address[]) {

    }

    function getBid(bytes32 _taskName) returns (address, uint256, string, uint256) {

    }

    function getCreatorTasks(address _creator, State _state) returns (bytes32, string, address, uint256, address, address, address, State) {

    }

    function getWorkerTasks(address _creator, State _state) returns (bytes32, string, address, uint256, address, address, address, State) {

    }

    function getRejectedTasks(address _creator, State _state) returns (bytes32, string, address, uint256, address, address, address) {

    }


}
