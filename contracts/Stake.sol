// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "hardhat/console.sol";

contract Stake is ReentrancyGuard {
    error Stake__noMoniesStaked();

    uint256 public stakedTotal; // variable T
    uint256 public rewardPerToken; // variable S
    uint256 constant TENTO18 = 1e18;

    //Events
    event Withdraw(address indexed staker, uint256 indexed amount); //withdraw event

    event Stake(address indexed staker, uint256 indexed amount);

    event Distribute(uint256 indexed amount, address indexed to);

    // state variables

    struct StakerProfile {
        address stakerAddress;
        uint256 currentStake;
        uint256 uncashedRewards;
        uint256 rewardsPayedOut;
        bool compoundRewards;
    }

    mapping(address => StakerProfile) public stakerToProfile;
    mapping(address => uint256) public mappingpricePerToken;

    ERC20 private usdT;

    //functions

    //address _token

    //constructor
    constructor() {}

    // receive function (if exists)

    // fallback function (if exists)

    // external
    function deposit(bool compoundRewards) external payable {
        StakerProfile storage staker = stakerToProfile[msg.sender];
        if (staker.stakerAddress == address(0)) {
            staker.stakerAddress = msg.sender;
        }
        //check if already staked
        if (staker.currentStake > 0) {
            _reStake(staker, msg.value, compoundRewards); // pass staker address and value of new stake
            //console.log("we hit restake");
            return;
        }
        //record amount staked
        staker.currentStake += msg.value;
        //store reward per token at time of new stake
        mappingpricePerToken[msg.sender] = rewardPerToken;
        //record total staked value
        stakedTotal += msg.value;
        //emit event
        emit Stake(msg.sender, msg.value);
    }

    function withdraw() external nonReentrant {
        StakerProfile storage staker = stakerToProfile[msg.sender];
        _withdraw(staker);
    }

    // public

    function distribute(uint256 _reward) public payable {
        if (stakedTotal == 0) {
            revert Stake__noMoniesStaked();
        } else {
            rewardPerToken =
                rewardPerToken +
                (((_reward * TENTO18) / stakedTotal));
        }
    }

    // internal
    function _withdraw(StakerProfile memory _staker) internal {
        uint256 totalDeposited = _staker.currentStake;

        uint256 reward = (totalDeposited *
            (rewardPerToken - mappingpricePerToken[msg.sender])) / TENTO18;

        stakedTotal -= totalDeposited; //offset amoutn withdrawn from stake total

        _staker.currentStake = 0; //reset stake amount for user
        _staker.rewardsPayedOut += reward; //record reward payed out to user

        uint256 depositAndReward = (totalDeposited + reward);

        (bool sent, ) = _staker.stakerAddress.call{value: depositAndReward}("");
        require(sent, "transfer failed");
        emit Withdraw(_staker.stakerAddress, depositAndReward);
    }

    function _reStake(
        StakerProfile storage _staker,
        uint256 _newDeposit,
        bool compoundRewards
    ) internal {
        //calculate current reward
        uint256 reward = (_staker.currentStake *
            (rewardPerToken - mappingpricePerToken[msg.sender])) / TENTO18;
        //record amount staked
        _staker.currentStake += _newDeposit;
        if (compoundRewards) {
            _staker.currentStake += reward; //compound rewards by restaking
        } else {
            _staker.uncashedRewards += reward; //If compound rewards is false save amoutn of uncashed rewards
        }
        //store reward per token at time of new stake
        mappingpricePerToken[msg.sender] = rewardPerToken;
        //record total staked value => T
        stakedTotal += msg.value;
        //emit event
        emit Stake(msg.sender, msg.value);
    }
    // private
}
