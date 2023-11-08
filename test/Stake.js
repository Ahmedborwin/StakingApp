const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether");
};

const formatEth = (n) => {
  return ethers.utils.formatEther(n.toString());
};

const ether = tokens;
let stake, deployer, staker1, staker2, staker3, staker4;
describe("Stake Contract", () => {
  beforeEach("deploy contract", async () => {
    [deployer, staker1, staker2, staker3, staker4] = await ethers.getSigners();
    //deploy contract
    const stakeFactory = await ethers.getContractFactory("Stake");
    stake = await stakeFactory.deploy();
  });
  describe("Stake Function", async () => {
    it("updates mapping to reflect staked amount ", async () => {
      await stake.connect(staker1).deposit(false, { value: ether(1) });
      const stakerProfile = await stake.stakerToProfile(staker1.address);
      expect(stakerProfile.currentStake).equal(ether(1));
    });
    it("stores price per token at time of stake event", async () => {
      await stake.connect(staker1).deposit(false, { value: ether(1) });
      expect(
        (await stake.mappingpricePerToken(staker1.address)).toString()
      ).equal("0"); //should equal to 0 on initial stake event
    });
    it("updates total amount staked ", async () => {
      await stake.connect(staker1).deposit(false, { value: ether(1) });

      expect(await stake.stakedTotal()).equal(ether(1));
    });
    it("stake event emitted", async () => {
      expect(await stake.connect(staker1).deposit(false, { value: ether(1) }))
        .emit(stake, "Stake")
        .withArgs(staker1.address, tokens(1));
    });
  });
  describe("Distribute Function", async () => {
    it("update price per token staked", async () => {
      await stake.connect(staker1).deposit(false, { value: ether(1) });
      await stake.distribute(tokens(10));
      const pricePerToken = await stake.rewardPerToken();
    });
    it("rejects if no monies staked", async () => {
      await expect(
        stake.connect(staker1).distribute(tokens(1))
      ).revertedWithCustomError(stake, "Stake__noMoniesStaked");
    });
  });
  describe("Withdraw Function", async () => {
    describe("success", async () => {
      beforeEach(
        ("stake set up",
        async () => {
          await stake.connect(staker1).deposit(false, { value: ether(1) });
          await stake.distribute(ether(10), { value: ether(10) });
        })
      );
      it("single staker to withdraw full reward , staked total updated and stake by address reset", async () => {
        await expect(stake.connect(staker1).withdraw()).changeEtherBalance(
          staker1.address,
          ether(11)
        );
      });
      it("withdraw event emitted", async () => {
        await expect(stake.connect(staker1).withdraw())
          .emit(stake, "Withdraw")
          .withArgs(staker1.address, ether(11));
      });
      it("proportional reward when multiple stakers", async () => {
        await stake.connect(staker2).deposit(false, { value: ether(1) });
        await stake.connect(staker3).deposit(false, { value: ether(1) });
        await stake.connect(staker4).deposit(false, { value: ether(1) });
        await stake.distribute(ether(10), { value: ether(10) });
        await expect(stake.connect(staker1).withdraw())
          .emit(stake, "Withdraw")
          .withArgs(staker1.address, ether(13.5));
      });
    });
    describe("failure", async () => {
      it("fails if transfer is unsuccesfull", async () => {
        await stake.connect(staker1).deposit(false, { value: ether(1) });
        await stake.distribute(ether(10));
        await expect(stake.connect(staker1).withdraw()).revertedWith(
          "transfer failed"
        );
      });
      it("", async () => {});
      it("", async () => {});
    });
  });
  describe("Restake Functionality", async () => {
    describe("success", async () => {
      beforeEach("stake ether", async () => {
        await stake.connect(staker1).deposit(false, { value: ether(1) });
        await stake.distribute(ether(10), { value: ether(10) });
      });

      it("Restake - Does not compound rewards:", async () => {
        await stake.connect(staker1).deposit(false, { value: ether(1) });
        const userProfile = await stake.stakerToProfile(staker1.address);
        expect(userProfile.currentStake.toString()).equal(ether(2));
        expect(userProfile.uncashedRewards.toString()).equal(ether(10));
      });
      it("Restake - Does compound rewards:", async () => {
        await stake.connect(staker1).deposit(true, { value: ether(1) });
        const userProfile = await stake.stakerToProfile(staker1.address);
        expect(userProfile.currentStake.toString()).equal(ether(12));
      });
    });

    describe("Unsuccessful", async () => {
      beforeEach("stake ether", async () => {
        await stake.connect(staker1).deposit(false, { value: ether(1) });
        await stake.distribute(ether(10), { value: ether(10) });
      });
      it("", async () => {});
      it("", async () => {});
    });
  });
});
