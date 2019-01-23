var EscrowTaskBoard = artifacts.require('./EscrowTaskBoard')

module.exports = function (deployer) {
  deployer.deploy(EscrowTaskBoard)
}
