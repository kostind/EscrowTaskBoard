var EscrowTaskBoard = artifacts.require('./EscrowTaskBoard.sol')

module.exports = function (deployer) {
  deployer.deploy(EscrowTaskBoard)
}
