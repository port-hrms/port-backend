// @ts-nocheck

const payrollQueryService = require("./payrollQueryService");
const payrollGenerationService = require("./payrollGenerationService");
const payrollMutationService = require("./payrollMutationService");

module.exports = {
  ...payrollQueryService,
  ...payrollGenerationService,
  ...payrollMutationService,
};
