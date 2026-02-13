import { PriceCalcOption } from '@prisma/client';

export interface PricingInput {
  warehouseSqm: number;
  warehouseRentPrice: number;
  officeSqm: number;
  officeRentPrice: number;
  sanitarySqm: number;
  sanitaryRentPrice: number;
  othersSqm: number;
  othersRentPrice: number;
  leaseTermMonths: number;
  incentiveMonths: number;
  earlyAccessMonths: number;
  priceCalcOption: PriceCalcOption;
}

export function calculateEffectiveRent(input: PricingInput): {
  totalRent: number;
  coefficient: number;
  effectiveRent: number;
} {
  const totalRent =
    (input.warehouseSqm || 0) * (input.warehouseRentPrice || 0) +
    (input.officeSqm || 0) * (input.officeRentPrice || 0) +
    (input.sanitarySqm || 0) * (input.sanitaryRentPrice || 0) +
    (input.othersSqm || 0) * (input.othersRentPrice || 0);

  let coefficient = 1;

  if (input.priceCalcOption === PriceCalcOption.OPTION_ONE) {
    const denominator =
      (input.leaseTermMonths || 0) +
      (input.incentiveMonths || 0) +
      (input.earlyAccessMonths || 0);
    coefficient = denominator > 0 ? (input.leaseTermMonths || 0) / denominator : 1;
  } else if (input.priceCalcOption === PriceCalcOption.OPTION_TWO) {
    const leaseMonths = input.leaseTermMonths || 0;
    const numerator =
      leaseMonths - (input.incentiveMonths || 0) - (input.earlyAccessMonths || 0);
    coefficient = leaseMonths > 0 ? numerator / leaseMonths : 1;
  }

  const effectiveRent = totalRent * coefficient;

  return { totalRent, coefficient, effectiveRent };
}
