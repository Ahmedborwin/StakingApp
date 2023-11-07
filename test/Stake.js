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
      await stake.connect(staker1).deposit({ value: ether(1) });
      expect(await stake.stake(staker1.address)).equal(ether(1));
    });
    it("updates price per token at time of stake event", async () => {
      await stake.connect(staker1).deposit({ value: ether(1) });
      expect(
        (await stake.mappingpricePerToken(staker1.address)).toString()
      ).equal("0");
    });
    it("updates total amount staked variable", async () => {
      await stake.connect(staker1).deposit({ value: ether(1) });
      expect(await stake.stakedTotal()).equal(ether(1));
    });
    it("stake event emitted", async () => {
      expect(await stake.connect(staker1).deposit({ value: ether(1) }))
        .emit(stake, "Stake")
        .withArgs(staker1.address, tokens(1));
    });
  });
  describe("Distribute Function", async () => {
    it("update price per token staked", async () => {
      await stake.connect(staker1).deposit({ value: ether(1) });
      await stake.distribute(tokens(10));
      const pricePerToken = await stake.pricePerToken();
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
          await stake.connect(staker1).deposit({ value: ether(1) });
          await stake.distribute(ether(10), { value: ether(10) });
        })
      );
      it("single staker to withdraw full reward , staked total updated and stake by address reset", async () => {
        // console.log(
        //   "Pre withdraw balance",
        //   formatEth(await ethers.provider.getBalance(staker1.address))
        // );

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
        await stake.connect(staker2).deposit({ value: ether(1) });
        await stake.connect(staker3).deposit({ value: ether(1) });
        await stake.connect(staker4).deposit({ value: ether(1) });
        await stake.distribute(ether(10), { value: ether(10) });
        await expect(stake.connect(staker1).withdraw())
          .emit(stake, "Withdraw")
          .withArgs(staker1.address, ether(13.5));
      });
    });
    describe("failure", async () => {
      it("fails if transfer is unsuccesfull", async () => {
        await stake.connect(staker1).deposit({ value: ether(1) });
        await stake.distribute(ether(10));
        await expect(stake.connect(staker1).withdraw()).revertedWith(
          "transfer failed"
        );
      });
      it("", async () => {});
      it("", async () => {});
    });
  });
});
