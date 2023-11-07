// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "hardhat/console.sol";

contract Stake is ReentrancyGuard {
    error Stake__noMoniesStaked();

    uint256 public stakedTotal; // variable T
    uint256 public pricePerToken; // variable S

    //Events
    event Withdraw(address indexed staker, uint256 indexed amount); //withdraw event

    event Stake(address indexed staker, uint256 indexed amount);

    event Distribute(uint256 indexed amount, address indexed to);

    // state variables

    mapping(address => uint256) public stake;
    mapping(address => uint256) public mappingpricePerToken;

    ERC20 private usdT;

    //functions

    //address _token

    //constructor
    constructor() {}

    // receive function (if exists)

    // fallback function (if exists)

    // external
    function deposit() external payable {
        //record amount staked
        stake[msg.sender] += msg.value;
        //store reward per token at time of new stake
        mappingpricePerToken[msg.sender] = pricePerToken;
        //record total staked value => T
        stakedTotal += msg.value;
        //emit event
        emit Stake(msg.sender, msg.value);
    }

    function withdraw() external nonReentrant {
        _withdraw(msg.sender);
    }

    // public

    function distribute(uint256 _reward) public payable {
        if (stakedTotal == 0) {
            revert Stake__noMoniesStaked();
        } else {
            pricePerToken = pricePerToken + (((_reward * 1e18) / stakedTotal));
        }
    }

    // internal
    function _withdraw(address _caller) internal {
        uint256 deposited = stake[_caller];

        uint256 reward = (deposited *
            (pricePerToken - mappingpricePerToken[msg.sender])) / 1e18;

        stakedTotal -= deposited;
        stake[_caller] = 0;
        uint256 depositAndReward = (deposited + reward);
        //console.log(depositAndReward);
        (bool sent, ) = _caller.call{value: depositAndReward}("");
        require(sent, "transfer failed");
        emit Withdraw(_caller, depositAndReward);
    }

    // private
}
