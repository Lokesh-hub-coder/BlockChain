import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const PraiseBoardModule = buildModule("PraiseBoardModule", (m) => {
  const praiseBoard = m.contract("PraiseBoard");
  return { praiseBoard };
});

export default PraiseBoardModule;
